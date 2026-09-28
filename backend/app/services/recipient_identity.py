"""Customer-facing receiving identity and privacy-limited recipient lookup."""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.user import User


class RecipientNotFound(ValueError):
    pass


class InvalidRecipientIdentifier(ValueError):
    pass


@dataclass(frozen=True)
class RecipientIdentity:
    display_name: str
    handle: str | None
    account_number: str
    masked_phone_number: str | None
    account_id: uuid.UUID


def normalize_ghana_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if digits.startswith("233") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 10:
        return f"+233{digits[1:]}"
    raise InvalidRecipientIdentifier("Enter a valid Ghana phone number.")


def normalize_handle(value: str) -> str:
    normalized = value.strip().removeprefix("@").casefold()
    if not re.fullmatch(r"[a-z0-9_]{3,30}", normalized):
        raise InvalidRecipientIdentifier("Use a handle with 3–30 letters, numbers, or underscores.")
    return normalized


def mask_phone(value: str | None) -> str | None:
    if not value:
        return None
    return f"{value[:7]}•••{value[-2:]}"


def _recipient_for_user(db: Session, user: User) -> tuple[Account, User] | None:
    account = db.execute(
        select(Account)
        .where(Account.user_id == user.id, Account.status == "ACTIVE")
        .order_by(case((Account.type == "MAIN", 0), else_=1), Account.created_at, Account.id)
    ).scalars().first()
    return (account, user) if account else None


def resolve_recipient(db: Session, identifier: str) -> RecipientIdentity:
    """Resolve a public identifier or authenticated internal UUID to a canonical account."""
    value = identifier.strip()
    if not value:
        raise InvalidRecipientIdentifier("Enter an account number, @handle, phone number, or QR code.")

    account: Account | None = None
    user: User | None = None
    if value.startswith("arezak://receive/"):
        token = value.removeprefix("arezak://receive/").strip("/")
        account = db.execute(select(Account).where(Account.qr_token == token, Account.status == "ACTIVE")).scalar_one_or_none()
    elif value.startswith("@"):
        user = db.execute(select(User).where(func.lower(User.handle) == normalize_handle(value))).scalar_one_or_none()
    elif value.isdigit() and len(value) == 12:
        account = db.execute(select(Account).where(Account.account_number == value, Account.status == "ACTIVE")).scalar_one_or_none()
    elif value.startswith("+") or (value.startswith("0") and value.isdigit()):
        phone = normalize_ghana_phone(value)
        user = db.execute(
            select(User).where(User.phone_number == phone, User.phone_verified.is_(True))
        ).scalar_one_or_none()
    else:
        try:
            user_id = uuid.UUID(value)
        except ValueError as exc:
            raise InvalidRecipientIdentifier("Use an account number, @handle, phone number, or QR code.") from exc
        user = db.get(User, user_id)

    if account is None and user is not None:
        resolved = _recipient_for_user(db, user)
        if resolved:
            account, user = resolved
    if account is not None and user is None:
        user = db.get(User, account.user_id)
    if account is None or user is None or account.status != "ACTIVE":
        raise RecipientNotFound("We couldn’t find an active Arezak account for that identifier.")

    return RecipientIdentity(
        display_name=user.name,
        handle=f"@{user.handle}" if user.handle else None,
        account_number=account.account_number,
        masked_phone_number=mask_phone(user.phone_number) if user.phone_verified else None,
        account_id=account.id,
    )
