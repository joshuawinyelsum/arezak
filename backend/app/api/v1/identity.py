"""Authenticated Arezak receiving identity and recipient resolution APIs."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Response, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, SessionDep, OnboardingUser
from app.models.account import Account
from app.models.user import User
from app.services.recipient_identity import (
    InvalidRecipientIdentifier,
    RecipientNotFound,
    normalize_handle,
    resolve_recipient,
)

router = APIRouter(prefix="/identity", tags=["identity"])


class ReceivingAccount(BaseModel):
    account_id: uuid.UUID
    account_name: str
    account_number: str
    qr_payload: str


class MyIdentityResponse(BaseModel):
    display_name: str
    handle: str | None
    email: str
    profile_photo_url: str | None = None
    phone_number: str | None
    phone_verified: bool
    accounts: list[ReceivingAccount]


class RecipientLookupRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)


class RecipientLookupResponse(BaseModel):
    display_name: str
    handle: str | None
    account_number: str
    masked_phone_number: str | None
    recipient_type: str = "AREZAK_USER"


class ProfileUpdateRequest(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=255)
    last_name: str | None = Field(default=None, min_length=1, max_length=255)
    profile_photo_url: str | None = Field(default=None, max_length=1024)

class HandleUpdateRequest(BaseModel):
    handle: str = Field(min_length=3, max_length=31)


@router.get("/me", response_model=MyIdentityResponse)
def get_my_identity(db: SessionDep, current_user: CurrentUser):
    accounts = db.query(Account).filter_by(user_id=current_user.id).order_by(Account.created_at, Account.id).all()
    return MyIdentityResponse(
        display_name=current_user.name,
        handle=f"@{current_user.handle}" if current_user.handle else None,
        email=current_user.email,
        profile_photo_url=current_user.profile_photo_url,
        # Do not publish phone numbers until an explicit verification flow exists.
        phone_number=current_user.phone_number if current_user.phone_verified else None,
        phone_verified=current_user.phone_verified,
        accounts=[ReceivingAccount(
            account_id=account.id,
            account_name=account.name,
            account_number=account.account_number,
            qr_payload=f"arezak://receive/{account.qr_token}",
        ) for account in accounts],
    )


@router.post("/resolve", response_model=RecipientLookupResponse)
def lookup_recipient(request: RecipientLookupRequest, db: SessionDep, current_user: CurrentUser):
    try:
        identity = resolve_recipient(db, request.identifier)
    except InvalidRecipientIdentifier as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RecipientNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return RecipientLookupResponse(
        display_name=identity.display_name,
        handle=identity.handle,
        account_number=identity.account_number,
        masked_phone_number=identity.masked_phone_number,
    )


@router.patch("/handle", response_model=MyIdentityResponse)
def update_handle(request: HandleUpdateRequest, db: SessionDep, current_user: OnboardingUser, response: Response):
    try:
        current_user.handle = normalize_handle(request.handle)
    except InvalidRecipientIdentifier as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="That handle is already in use.") from exc
    db.refresh(current_user)
    
    if current_user.phone_verified and not current_user.accounts:
        from app.services.account_identity import create_account
        create_account(db, user_id=current_user.id, name="Main Account", account_type="MAIN")
        db.commit()
        db.refresh(current_user)
        
    if current_user.phone_verified and current_user.handle:
        from app.api.v1.auth import _set_auth_cookie
        _set_auth_cookie(response, str(current_user.id), is_onboarding=False)
        
    return get_my_identity(db, current_user)



@router.patch("/profile", response_model=MyIdentityResponse)
def update_profile(request: ProfileUpdateRequest, db: SessionDep, current_user: CurrentUser):
    if request.first_name is not None:
        current_user.first_name = request.first_name
    if request.last_name is not None:
        current_user.last_name = request.last_name
    if request.profile_photo_url is not None:
        current_user.profile_photo_url = request.profile_photo_url
        
    db.commit()
    db.refresh(current_user)
    return get_my_identity(db, current_user)


@router.put("/profile/photo", response_model=MyIdentityResponse)
def upload_photo(db: SessionDep, current_user: CurrentUser, file: UploadFile = File(...)):
    from app.services.storage import storage_service, StorageConfigurationError
    try:
        url = storage_service.upload_profile_photo(current_user.id, file)
        current_user.profile_photo_url = url
        db.commit()
        db.refresh(current_user)
        return get_my_identity(db, current_user)
    except StorageConfigurationError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.delete("/profile/photo", response_model=MyIdentityResponse)
def remove_photo(db: SessionDep, current_user: CurrentUser):
    from app.services.storage import storage_service
    if current_user.profile_photo_url:
        storage_service.delete_profile_photo(current_user.profile_photo_url)
        current_user.profile_photo_url = None
        db.commit()
        db.refresh(current_user)
    return get_my_identity(db, current_user)


class MessageResponse(BaseModel):
    message: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

class SecurityStatusResponse(BaseModel):
    has_password: bool
    connected_providers: list[str]
    phone_verified: bool
    email_verified: bool

@router.get("/security", response_model=SecurityStatusResponse)
def get_security_status(db: SessionDep, current_user: CurrentUser):
    from app.models.provider_identity import ProviderIdentity
    providers = db.query(ProviderIdentity).filter_by(user_id=current_user.id).all()
    
    return SecurityStatusResponse(
        has_password=bool(current_user.password_hash),
        connected_providers=[p.provider for p in providers],
        phone_verified=current_user.phone_verified,
        email_verified=current_user.email_verified
    )

@router.post("/change-password", response_model=MessageResponse)
def change_password(request: ChangePasswordRequest, db: SessionDep, current_user: CurrentUser):
    from app.core.security import verify_password, get_password_hash
    
    if current_user.password_hash and not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    current_user.password_hash = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


class RequestPhoneChangeRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)

@router.post("/request-phone-change", response_model=MessageResponse)
def request_phone_change(request: RequestPhoneChangeRequest, db: SessionDep, current_user: CurrentUser):
    # Check if phone number is already taken by another user
    existing = db.query(User).filter(User.phone_number == request.phone_number, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This phone number is already registered to another account.")
        
    from app.services.otp_service import generate_and_send_otp, OTPRateLimitExceeded
    try:
        generate_and_send_otp(db, request.phone_number)
    except OTPRateLimitExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
        
    return {"message": "OTP sent to new phone number"}

class VerifyPhoneChangeRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)
    otp: str

@router.post("/verify-phone-change", response_model=MyIdentityResponse)
def verify_phone_change(request: VerifyPhoneChangeRequest, db: SessionDep, current_user: CurrentUser):
    from app.services.otp_service import verify_otp
    if not verify_otp(db, request.phone_number, request.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    current_user.phone_number = request.phone_number
    current_user.phone_verified = True
    db.commit()
    db.refresh(current_user)
    
    return get_my_identity(db, current_user)
