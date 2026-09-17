from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
import uuid

from app.models.account import Account
from app.models.transaction import Transaction
from app.models.ledger_entry import LedgerEntry
from app.models.audit_log import AuditLog

from app.rules import engine, EvaluationContext, ConstraintViolationException

def record_audit(db: Session, user_id: uuid.UUID, entity_type: str, entity_id: uuid.UUID, event_type: str, reason: str = ""):
    audit = AuditLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        reason=reason
    )
    db.add(audit)

def process_income(db: Session, user_id: uuid.UUID, account_id: uuid.UUID, amount_pesewas: int, currency: str = "GHS", idempotency_key: str | None = None, description: str = "") -> Transaction:
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id).first()
        if existing_tx:
            return existing_tx

    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type="INCOME",
        amount_pesewas=amount_pesewas,
        currency=currency,
        account_id=account_id
    )
    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)

    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id).first()
        if existing_tx:
            return existing_tx

    account = context.account

    # 2. Update Account Balance Projection
    account.available_balance += amount_pesewas

    # 3. Create Transaction Operation
    transaction = Transaction(
        user_id=user_id,
        account_id=account.id,
        type="INCOME",
        amount=amount_pesewas,
        currency=currency,
        reference=idempotency_key,
        description=description
    )
    db.add(transaction)
    db.flush() # To get transaction.id

    # 4. Create Ledger Entry for Immutable History
    ledger_entry = LedgerEntry(
        account_id=account.id,
        transaction_id=transaction.id,
        entry_type="CREDIT",
        amount=amount_pesewas,
        currency=currency,
        description=description
    )
    db.add(ledger_entry)

    # 5. Audit Log
    record_audit(db, user_id, "TRANSACTION", transaction.id, "TRANSACTION_CREATED", "Income processed")

    return transaction

def process_expense(db: Session, user_id: uuid.UUID, account_id: uuid.UUID, amount_pesewas: int, currency: str = "GHS", idempotency_key: str | None = None, description: str = "") -> Transaction:
    # Early idempotency check for performance
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id).first()
        if existing_tx:
            return existing_tx

    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type="SPEND",
        amount_pesewas=amount_pesewas,
        currency=currency,
        account_id=account_id
    )
    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)

    # Double-checked locking: Now that we hold the Account row-lock (via the engine),
    # verify that another thread didn't process this exact idempotency key while we were blocked.
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id).first()
        if existing_tx:
            return existing_tx

    account = context.account

    # 2. Update Account
    account.available_balance -= amount_pesewas

    # 3. Create Transaction
    transaction = Transaction(
        user_id=user_id,
        account_id=account.id,
        type="EXPENSE",
        amount=amount_pesewas,
        currency=currency,
        reference=idempotency_key,
        description=description
    )
    db.add(transaction)
    db.flush()

    # 4. Create Ledger Entry (DEBIT)
    ledger_entry = LedgerEntry(
        account_id=account.id,
        transaction_id=transaction.id,
        entry_type="DEBIT",
        amount=amount_pesewas,
        currency=currency,
        description=description
    )
    db.add(ledger_entry)

    # 5. Audit Log
    record_audit(db, user_id, "TRANSACTION", transaction.id, "TRANSACTION_CREATED", "Expense processed")

    return transaction
