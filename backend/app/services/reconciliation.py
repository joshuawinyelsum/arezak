"""Compare Arezak state with durable provider and ledger evidence."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from sqlalchemy.orm import Session
from app.models.ledger_entry import LedgerEntry
from app.models.provider_attempt import ProviderAttempt
from app.models.reconciliation_record import ReconciliationRecord
from app.models.transaction import Transaction, TransactionStatus


@dataclass(frozen=True)
class ReconciliationResult:
    status: str
    discrepancy_code: str | None
    evidence: dict
    record_id: uuid.UUID


def reconcile_transaction(
    db: Session,
    transaction_id: uuid.UUID,
    provider_status: str | None = None,
    provider_reference: str | None = None,
    provider_amount_pesewas: int | None = None,
    provider_currency: str | None = None,
    provider_error: str | None = None,
) -> ReconciliationResult:
    tx = db.get(Transaction, transaction_id)
    if tx is None:
        raise ValueError("Transaction not found.")
    attempt = (db.query(ProviderAttempt).filter_by(transaction_id=tx.id)
               .order_by(ProviderAttempt.attempt_number.desc()).first())
    entries = db.query(LedgerEntry).filter_by(transaction_id=tx.id).all()
    credits = sum(e.amount for e in entries if str(e.entry_type) == "CREDIT")
    debits = sum(e.amount for e in entries if str(e.entry_type) == "DEBIT")
    evidence = {
        "transaction": {"id": str(tx.id), "status": tx.status, "amount_pesewas": tx.amount,
                        "currency": tx.currency, "provider_reference": tx.provider_reference},
        "attempt": None if attempt is None else {
            "id": str(attempt.id), "status": attempt.status,
            "provider_code": attempt.provider_code, "reference": attempt.provider_reference,
            "amount_pesewas": attempt.amount_pesewas,
        },
        "ledger": {"credit_pesewas": credits, "debit_pesewas": debits,
                   "balanced": credits == debits},
        "provider_observation": {"status": provider_status, "reference": provider_reference,
                                 "amount_pesewas": provider_amount_pesewas,
                                 "currency": provider_currency, "error": provider_error},
    }
    discrepancy = None
    if attempt is None:
        discrepancy = "MISSING_PROVIDER_ATTEMPT"
    elif not evidence["ledger"]["balanced"]:
        discrepancy = "UNBALANCED_LEDGER"
    elif provider_amount_pesewas is not None and provider_amount_pesewas != attempt.amount_pesewas:
        discrepancy = "AMOUNT_MISMATCH"
    elif provider_currency is not None and provider_currency != tx.currency:
        discrepancy = "CURRENCY_MISMATCH"
    elif provider_status is not None and provider_reference != attempt.provider_reference:
        discrepancy = "REFERENCE_MISMATCH"
    elif provider_status and provider_status.upper() in ("SUCCEEDED", "COMPLETED") and tx.status not in (TransactionStatus.COMPLETED.value,):
        discrepancy = "PROVIDER_COMPLETED_AREZAK_PENDING"
    elif provider_status and provider_status.upper() == "FAILED" and tx.status == TransactionStatus.COMPLETED.value:
        discrepancy = "PROVIDER_FAILED_AREZAK_COMPLETED"
    elif provider_status and provider_status.upper() == "FAILED" and tx.status != TransactionStatus.FAILED.value:
        discrepancy = "PROVIDER_FAILED_AREZAK_UNRESOLVED"
    elif provider_status and provider_status.upper() in ("PENDING", "IN_DOUBT", "UNKNOWN", "QUERY_ERROR"):
        discrepancy = "PROVIDER_STATUS_UNRESOLVED"
    elif provider_status and provider_status.upper() in ("NOT_FOUND", "UNKNOWN"):
        discrepancy = "AREZAK_TRANSACTION_MISSING_AT_PROVIDER"
    result_status = "DISCREPANCY" if discrepancy else "MATCH"
    record = ReconciliationRecord(
        transaction_id=tx.id, provider_attempt_id=attempt.id if attempt else None,
        status=result_status, discrepancy_code=discrepancy,
        evidence_json=json.dumps(evidence, sort_keys=True),
    )
    db.add(record)
    db.flush()
    return ReconciliationResult(result_status, discrepancy, evidence, record.id)


def reconcile_due_transactions(
    db: Session,
    hub,
    *,
    processing_timeout: timedelta = timedelta(minutes=5),
) -> list[ReconciliationResult]:
    """Query provider evidence for every uncertain or overdue movement.

    This is a callable worker/service foundation; scheduling is deployment-owned.
    Provider mismatches are recorded and left unresolved for operator review.
    """
    cutoff = datetime.now(timezone.utc) - processing_timeout
    candidates = (db.query(Transaction)
                  .filter(Transaction.status.in_((TransactionStatus.IN_DOUBT.value,
                                                  TransactionStatus.PROCESSING.value)))
                  .order_by(Transaction.created_at.asc()).all())
    results: list[ReconciliationResult] = []
    for tx in candidates:
        transaction_id = tx.id
        transaction_reference = tx.provider_reference
        created_at = tx.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if tx.status == TransactionStatus.PROCESSING.value and created_at > cutoff:
            continue
        try:
            results.append(hub.reconcile_provider_status(db, transaction_id))
        except Exception as exc:
            db.rollback()
            results.append(reconcile_transaction(
                db, transaction_id, provider_status="QUERY_ERROR",
                provider_reference=transaction_reference,
                provider_error=type(exc).__name__,
            ))
            db.flush()
    return results


def record_unmatched_provider_operation(
    db: Session, provider_code: str, provider_reference: str,
    amount_pesewas: int, currency: str, provider_status: str,
) -> ReconciliationResult:
    """Persist a provider-side operation that has no Arezak transaction match."""
    evidence = {
        "provider_observation": {
            "provider_code": provider_code,
            "provider_reference": provider_reference,
            "amount_pesewas": amount_pesewas,
            "currency": currency,
            "status": provider_status,
        },
        "arezak_transaction": None,
    }
    record = ReconciliationRecord(
        transaction_id=None, provider_attempt_id=None,
        status="DISCREPANCY", discrepancy_code="PROVIDER_WITHOUT_AREZAK_TRANSACTION",
        evidence_json=json.dumps(evidence, sort_keys=True),
    )
    db.add(record)
    db.flush()
    return ReconciliationResult("DISCREPANCY", record.discrepancy_code, evidence, record.id)
