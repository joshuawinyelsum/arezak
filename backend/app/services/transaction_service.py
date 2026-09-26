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

def process_income(
    db: Session, 
    user_id: uuid.UUID, 
    account_id: uuid.UUID, 
    amount_pesewas: int, 
    currency: str = "GHS", 
    idempotency_key: str | None = None, 
    description: str | None = None,
    funding_source: str | None = None,
    note: str | None = None
) -> Transaction:
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
        description=description,
        funding_source=funding_source,
        note=note
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


def process_outbound(db: Session, user_id: uuid.UUID, account_id: uuid.UUID, amount_pesewas: int, currency: str, tx_type: str, description: str, destination: str | None = None, idempotency_key: str | None = None) -> Transaction:
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id).first()
        if existing_tx:
            return existing_tx

    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type=tx_type, # SPEND, TRANSFER_OUT, WITHDRAWAL
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
    account.available_balance -= amount_pesewas
    account.total_balance -= amount_pesewas

    transaction = Transaction(
        user_id=user_id,
        account_id=account.id,
        type=tx_type,
        amount=amount_pesewas,
        currency=currency,
        reference=idempotency_key,
        description=description,
        note=destination
    )
    db.add(transaction)
    db.flush()

    ledger_entry = LedgerEntry(
        account_id=account.id,
        transaction_id=transaction.id,
        entry_type="DEBIT",
        amount=amount_pesewas,
        currency=currency,
        description=description
    )
    db.add(ledger_entry)

    record_audit(db, user_id, "TRANSACTION", transaction.id, f"{tx_type}_CREATED", "Outbound transaction processed")
    return transaction


def update_transaction_metadata(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
    description: str | None = None,
    funding_source: str | None = None,
    note: str | None = None
) -> Transaction:
    tx = db.query(Transaction).filter_by(id=transaction_id, user_id=user_id).first()
    if not tx:
        raise ValueError('Transaction not found')
        
    if tx.type not in ['INCOME', 'EXPENSE']:
        raise ValueError('Only user-entered transactions (INCOME/EXPENSE) can be edited')
        
    if funding_source is not None and len(funding_source) > 100:
        funding_source = funding_source[:100]
    if note is not None and len(note) > 500:
        note = note[:500]
        
    if description is not None:
        tx.description = description
    if funding_source is not None:
        tx.funding_source = funding_source
    if note is not None:
        tx.note = note
        
    db.commit()
    db.refresh(tx)
    return tx


def correct_transaction(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
    new_amount_pesewas: int,
    new_currency: str = 'GHS',
    idempotency_key: str | None = None
) -> Transaction:
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id).first()
        if existing_tx:
            return existing_tx

    tx = db.query(Transaction).filter_by(id=transaction_id, user_id=user_id).first()
    if not tx:
        raise ValueError('Transaction not found')

    if tx.type not in ['INCOME', 'EXPENSE']:
        raise ValueError('Only income and expense transactions can be corrected')

    if tx.status != 'COMPLETED':
        raise ValueError('Only completed transactions can be corrected')
        
    has_correction = db.query(Transaction).filter_by(reverses_transaction_id=tx.id).first() is not None
    if has_correction:
        raise ValueError('Transaction has already been corrected')

    if new_currency != tx.currency:
        raise ValueError('Currency conversion in correction is not supported. New currency must match original currency.')
        
    if new_amount_pesewas <= 0:
        raise ValueError('New amount must be strictly positive.')

    # Calculate net change to available balance (net debit is positive)
    if tx.type == 'INCOME':
        net_debit = tx.amount - new_amount_pesewas
    else: # EXPENSE
        net_debit = new_amount_pesewas - tx.amount

    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type='TRANSACTION_CORRECTION',
        amount_pesewas=net_debit, # Can be negative if it's a net credit
        currency=tx.currency,
        account_id=tx.account_id
    )
    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)
        
    account = context.account
    account.available_balance -= net_debit

    reversal_tx = Transaction(
        user_id=user_id,
        account_id=tx.account_id,
        type='CORRECTION_REVERSAL',
        amount=tx.amount,
        currency=tx.currency,
        description=f'Reversal of transaction {tx.id}',
        reverses_transaction_id=tx.id
    )
    db.add(reversal_tx)
    db.flush()

    replacement_tx = Transaction(
        user_id=user_id,
        account_id=tx.account_id,
        type=tx.type,
        amount=new_amount_pesewas,
        currency=new_currency,
        reference=idempotency_key,
        description=tx.description,
        funding_source=tx.funding_source,
        note=tx.note,
        correction_of_transaction_id=tx.id
    )
    db.add(replacement_tx)
    db.flush()

    reversal_entry = LedgerEntry(
        account_id=tx.account_id,
        transaction_id=reversal_tx.id,
        entry_type='DEBIT' if tx.type == 'INCOME' else 'CREDIT',
        amount=tx.amount,
        currency=tx.currency,
        description=f'Ledger reversal for {tx.id}'
    )
    db.add(reversal_entry)

    replacement_entry = LedgerEntry(
        account_id=tx.account_id,
        transaction_id=replacement_tx.id,
        entry_type='CREDIT' if tx.type == 'INCOME' else 'DEBIT',
        amount=new_amount_pesewas,
        currency=new_currency,
        description=tx.description
    )
    db.add(replacement_entry)

    record_audit(db, user_id, 'TRANSACTION', tx.id, 'TRANSACTION_CORRECTED', 'Transaction corrected via reversal')

    db.flush()
    return replacement_tx

