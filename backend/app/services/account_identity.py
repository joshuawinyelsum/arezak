"""Collision-safe assignment of public identifiers to financial accounts."""
from __future__ import annotations

import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.account import Account, generate_account_number, generate_qr_token


def create_account(
    db: Session,
    *,
    user_id: uuid.UUID,
    name: str,
    account_type: str = "MAIN",
) -> Account:
    """Insert account identifiers under a savepoint, retrying unique collisions."""
    for _ in range(8):
        account = Account(
            user_id=user_id,
            name=name,
            type=account_type,
            account_number=generate_account_number(),
            qr_token=generate_qr_token(),
        )
        try:
            with db.begin_nested():
                db.add(account)
                db.flush()
            return account
        except IntegrityError as exc:
            # Both public identifiers are random; a collision is safe to retry.
            constraint_name = getattr(getattr(exc.orig, "diag", None), "constraint_name", "") or ""
            message = str(exc.orig).casefold()
            if not (
                "account_number" in constraint_name
                or "qr_token" in constraint_name
                or "account_number" in message
                or "qr_token" in message
            ):
                raise
            continue
    raise RuntimeError("Could not allocate a unique Arezak account identity.")
