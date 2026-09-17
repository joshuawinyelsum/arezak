from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.api.deps import SessionDep, CurrentUser
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.account import Account
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, MessageResponse
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: SessionDep):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    user = User(
        email=user_in.email,
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
        currency=user_in.currency or "GHS",
        timezone=user_in.timezone or "UTC"
    )
    db.add(user)
    db.flush() # flush to get user ID
    
    # Create default main account for the user
    main_account = Account(
        user_id=user.id,
        name="Main Account",
        type="MAIN"
    )
    db.add(main_account)
    
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=MessageResponse)
def login(login_data: LoginRequest, db: SessionDep, response: Response):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    access_token = create_access_token(subject=str(user.id))
    
    is_secure = settings.ENVIRONMENT in ("staging", "production")
    
    # Set HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_secure,
        samesite="none" if is_secure else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    
    return {"message": "Successfully logged in"}

@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    is_secure = settings.ENVIRONMENT in ("staging", "production")
    response.delete_cookie(
        key="access_token", 
        samesite="none" if is_secure else "lax",
        secure=is_secure
    )
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: CurrentUser):
    return current_user

