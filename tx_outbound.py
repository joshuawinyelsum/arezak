import os
import re

p = 'backend/app/services/transaction_service.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

new_func = '''
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
'''

c = c.replace('def update_transaction_metadata', new_func + '\n\ndef update_transaction_metadata')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
