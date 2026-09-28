"""Synchronous Arezak-to-Arezak transfers on canonical account IDs."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.ledger_entry import LedgerEntry
from app.models.transaction import DestinationType, Transaction, TransactionType
from app.rules import EvaluationContext, engine
from app.rules.codes import DecisionCode
from app.rules.decision import ConstraintDecision, ConstraintViolationException
from app.services.transaction_service import record_audit


def initiate_internal_transfer(
    db: Session,
    *,
    user_id: uuid.UUID,
    source_account_id: uuid.UUID,
    recipient_account_id: uuid.UUID,
    amount_pesewas: int,
    currency: str = "GHS",
    idempotency_key: str,
    note: str | None = None,
) -> Transaction:
    if not idempotency_key or len(idempotency_key) > 255:
        raise ValueError("A valid idempotency key is required.")
    if source_account_id == recipient_account_id:
        raise ValueError("Choose a different Arezak account.")

    # A stable lock order prevents deadlocks between simultaneous reciprocal transfers.
    ordered_ids = sorted((source_account_id, recipient_account_id), key=str)
    locked = db.execute(
        select(Account)
        .where(Account.id.in_(ordered_ids))
        .order_by(Account.id)
        .with_for_update()
    ).scalars().all()
    accounts = {account.id: account for account in locked}
    source = accounts.get(source_account_id)
    recipient = accounts.get(recipient_account_id)
    if source is None or source.user_id != user_id:
        raise ValueError("Source account not found or access denied.")
    if recipient is None or recipient.status != "ACTIVE":
        raise ValueError("Recipient account is unavailable.")
    if source.user_id == recipient.user_id:
        raise ValueError("Choose another Arezak user.")
    if source.currency != currency or recipient.currency != currency or currency != "GHS":
        raise ValueError("Transfers are only available between GHS accounts.")

    existing = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id).first()
    if existing:
        if (
            existing.type != TransactionType.TRANSFER
            or existing.account_id != source_account_id
            or existing.recipient_account_id != recipient_account_id
            or existing.amount != amount_pesewas
            or existing.currency != currency
        ):
            raise ConstraintViolationException(ConstraintDecision.deny(
                code=DecisionCode.CONSTRAINT_VIOLATION,
                message="Idempotency key reused with different parameters.",
            ))
        return existing

    decision = engine.evaluate(EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type="SPEND",
        amount_pesewas=amount_pesewas,
        currency=currency,
        account_id=source_account_id,
    ))
    if not decision.allowed:
        raise ConstraintViolationException(decision)

    transaction = Transaction(
        user_id=user_id,
        account_id=source_account_id,
        recipient_account_id=recipient_account_id,
        type=TransactionType.TRANSFER,
        amount=amount_pesewas,
        currency=currency,
        status="COMPLETED",
        reference=idempotency_key,
        destination_type=DestinationType.AREZAK_USER.value,
        destination_address=recipient.account_number,
        rail="INTERNAL_AREZAK",
        description="Arezak transfer",
        note=note,
    )
    source.available_balance -= amount_pesewas
    recipient.available_balance += amount_pesewas
    db.add(transaction)
    db.flush()

    db.add_all([
        LedgerEntry(
            account_id=source.id,
            transaction_id=transaction.id,
            balance_type="AVAILABLE",
            entry_type="DEBIT",
            amount=amount_pesewas,
            currency=currency,
            description="Arezak transfer sent",
        ),
        LedgerEntry(
            account_id=recipient.id,
            transaction_id=transaction.id,
            balance_type="AVAILABLE",
            entry_type="CREDIT",
            amount=amount_pesewas,
            currency=currency,
            description="Arezak transfer received",
        ),
    ])
    record_audit(db, user_id, "TRANSACTION", transaction.id, "INTERNAL_TRANSFER_COMPLETED", "Arezak account transfer")
    return transaction
