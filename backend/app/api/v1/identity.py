"""Authenticated Arezak receiving identity and recipient resolution APIs."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, SessionDep
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


class HandleUpdateRequest(BaseModel):
    handle: str = Field(min_length=3, max_length=31)


@router.get("/me", response_model=MyIdentityResponse)
def get_my_identity(db: SessionDep, current_user: CurrentUser):
    accounts = db.query(Account).filter_by(user_id=current_user.id).order_by(Account.created_at, Account.id).all()
    return MyIdentityResponse(
        display_name=current_user.name,
        handle=f"@{current_user.handle}" if current_user.handle else None,
        email=current_user.email,
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
def update_handle(request: HandleUpdateRequest, db: SessionDep, current_user: CurrentUser):
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
    return get_my_identity(db, current_user)
