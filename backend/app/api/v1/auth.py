import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.api.deps import SessionDep, CurrentUser, OnboardingUser
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.provider_identity import ProviderIdentity
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, MessageResponse, SendOTPRequest, VerifyPhoneRequest, SocialAuthRequest
from app.core.config import settings
from app.services.recipient_identity import normalize_handle
from app.services.account_identity import create_account
from app.services.otp_service import generate_and_send_otp, verify_otp, OTPRateLimitExceeded
from app.services.social_auth import validate_google_token, validate_apple_token

router = APIRouter(prefix="/auth", tags=["auth"])

def _set_auth_cookie(response: Response, user_id: str, is_onboarding: bool = False):
    claims = {"scp": "onboarding"} if is_onboarding else {}
    access_token = create_access_token(subject=user_id, claims=claims)
    is_secure = settings.ENVIRONMENT in ("staging", "production")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_secure,
        samesite="none" if is_secure else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: SessionDep, response: Response):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
    if user_in.phone_number:
        if db.query(User).filter(User.phone_number == user_in.phone_number).first():
            raise HTTPException(status_code=400, detail="Phone number already in use.")

    handle = None
    if user_in.handle:
        try:
            handle = normalize_handle(user_in.handle)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if db.query(User).filter(User.handle == handle).first():
            raise HTTPException(status_code=409, detail="That handle is already in use.")
    
    user = User(
        email=user_in.email,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone_number=user_in.phone_number,
        handle=handle,
        password_hash=get_password_hash(user_in.password),
        currency=user_in.currency or "GHS",
        timezone=user_in.timezone or "UTC"
    )
    db.add(user)
    db.flush()
    db.commit()
    db.refresh(user)
    
    # Give onboarding token since they haven't verified phone yet
    _set_auth_cookie(response, str(user.id), is_onboarding=True)
    return user

@router.post("/login", response_model=MessageResponse)
def login(login_data: LoginRequest, db: SessionDep, response: Response):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not user.password_hash or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
        
    # Determine if user finished onboarding (phone verified and handle set)
    is_onboarding = not (user.phone_verified and user.handle)
    _set_auth_cookie(response, str(user.id), is_onboarding=is_onboarding)
    return {"message": "Successfully logged in"}

@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    is_secure = settings.ENVIRONMENT in ("staging", "production")
    response.delete_cookie(key="access_token", samesite="none" if is_secure else "lax", secure=is_secure)
    return {"message": "Successfully logged out"}

@router.post("/send-otp", response_model=MessageResponse)
def send_otp(req: SendOTPRequest, db: SessionDep):
    try:
        generate_and_send_otp(db, req.phone_number)
    except OTPRateLimitExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
    return {"message": "OTP sent successfully"}

@router.post("/verify-phone", response_model=MessageResponse)
def verify_phone(req: VerifyPhoneRequest, db: SessionDep, current_user: OnboardingUser, response: Response):
    if not verify_otp(db, req.phone_number, req.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    current_user.phone_verified = True
    current_user.phone_number = req.phone_number
    db.flush()
    
    # If handle is already set, they are fully onboarded, create Account and give full session
    if current_user.handle:
        # Check if account already exists to be safe
        if not current_user.accounts:
            create_account(db, user_id=current_user.id, name="Main Account", account_type="MAIN")
        _set_auth_cookie(response, str(current_user.id), is_onboarding=False)
        
    db.commit()
    return {"message": "Phone verified successfully"}

@router.post("/social", response_model=MessageResponse)
def social_auth(req: SocialAuthRequest, db: SessionDep, response: Response):
    try:
        if req.provider.lower() == "google":
            identity_data = validate_google_token(req.token)
        elif req.provider.lower() == "apple":
            identity_data = validate_apple_token(req.token, expected_nonce=req.nonce, first_name=req.first_name, last_name=req.last_name)
        else:
            raise ValueError("Unsupported provider")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    identity = db.query(ProviderIdentity).filter(
        ProviderIdentity.provider == req.provider,
        ProviderIdentity.provider_user_id == identity_data["provider_user_id"]
    ).first()
    
    if identity:
        user = identity.user
    else:
        email = identity_data.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Provider did not return an email.")
            
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                first_name=identity_data.get("first_name", "User"),
                last_name=identity_data.get("last_name", ""),
                email_verified=True,
            )
            db.add(user)
            db.flush()
            
        new_identity = ProviderIdentity(
            user_id=user.id,
            provider=req.provider,
            provider_user_id=identity_data["provider_user_id"],
            provider_email=email
        )
        db.add(new_identity)
        db.commit()
        db.refresh(user)
        
    is_onboarding = not (user.phone_verified and user.handle)
    _set_auth_cookie(response, str(user.id), is_onboarding=is_onboarding)
    return {"message": "Social authentication successful"}


from app.core.security import decode_access_token
from fastapi import Request

@router.get("/me")
def get_me(request: Request, db: SessionDep):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    scope = payload.get("scp", "full")
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "handle": user.handle,
        "phone_number": user.phone_number,
        "phone_verified": user.phone_verified,
        "profile_photo_url": user.profile_photo_url,
        "status": "onboarding" if scope == "onboarding" else "authenticated"
    }

from app.schemas.auth import RequestPasswordResetRequest, ConfirmPasswordResetRequest
import logging
logger = logging.getLogger(__name__)

@router.post("/request-password-reset", response_model=MessageResponse)
def request_password_reset(req: RequestPasswordResetRequest, db: SessionDep, request: Request):
    user = db.query(User).filter(User.email == req.email).first()
    if user and user.password_hash:
        # Generate reset token: use user_id, add a claim with password_hash prefix so it invalidates on change
        reset_token = create_access_token(
            subject=str(user.id),
            expires_delta=timedelta(minutes=30),
            claims={"type": "password_reset", "pwd": user.password_hash[:10]}
        )
        # Log the token for local testing since we don't have an email provider
        origin = request.headers.get("origin") or "http://localhost:3000"
        reset_url = f"{origin}/reset-password?token={reset_token}"
        logger.info(f"Password reset link for {user.email}: {reset_url}")
        print(f"\n*** PASSWORD RESET LINK FOR {user.email}: {reset_url} ***\n")
        
    # Always return success to prevent email enumeration
    return {"message": "If an account exists with that email, a password reset link has been sent."}

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ConfirmPasswordResetRequest, db: SessionDep):
    payload = decode_access_token(req.token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user_id = payload.get("sub")
    pwd_prefix = payload.get("pwd")
    if not user_id or not pwd_prefix:
        raise HTTPException(status_code=400, detail="Invalid reset token structure")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    # Check if the token is still valid for the current password hash
    if user.password_hash[:10] != pwd_prefix:
        raise HTTPException(status_code=400, detail="Reset token has already been used")
        
    # Minimum length validation
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
    # Update password
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    
    return {"message": "Password has been successfully reset"}
