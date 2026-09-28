"""
transaction_lifecycle.py
========================
Enforces the Transaction state machine.

This module is the ONLY place where transaction.status is mutated for lifecycle
transitions. No other service or API route should directly set transaction.status.

State machine:
  PENDING → PROCESSING → COMPLETED
  PENDING → FAILED
  PENDING → CANCELLED
  PROCESSING → FAILED
  PROCESSING → CANCELLED  (rare)

Terminal states: COMPLETED, FAILED, CANCELLED

Ledger posting rules:
  - External DEBIT operations (SEND/PAY/WITHDRAW):
      On PENDING:    move available → reserved (reserve funds, prevents double-spend)
      On COMPLETED:  move reserved → EXTERNAL (post ledger debit, release reservation)
      On FAILED/CANCELLED: move reserved → available (release reservation, no ledger debit)

  - External CREDIT operations (FUND):
      On PENDING:    record intent — no balance mutation yet
      On COMPLETED:  post AVAILABLE CREDIT + EXTERNAL DEBIT (funds land)
      On FAILED:     no balance mutation (nothing to reverse)

  - Internal operations (GOAL_CONTRIBUTION, GOAL_WITHDRAWAL, INCOME, EXPENSE, corrections):
      Created directly as COMPLETED. Lifecycle module is NOT used for these.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.account import Account
from app.models.ledger_entry import LedgerEntry
from app.models.provider_attempt import ProviderAttempt
from app.services.transaction_service import record_audit
from app.rules.codes import DecisionCode
from app.rules.decision import ConstraintViolationException, ConstraintDecision


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _load_transaction_for_update(
    db: Session, transaction_id: uuid.UUID, user_id: uuid.UUID
) -> Transaction:
    """Load transaction with a row-level lock. Verifies ownership."""
    tx = db.execute(
        select(Transaction)
        .where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        .with_for_update()
    ).scalar_one_or_none()
    if not tx:
        raise ValueError("Transaction not found or access denied.")
    return tx


def _load_account_for_update(db: Session, account_id: uuid.UUID) -> Account:
    acc = db.execute(
        select(Account).where(Account.id == account_id).with_for_update()
    ).scalar_one_or_none()
    if not acc:
        raise ValueError("Account not found.")
    return acc


def _assert_transition(tx: Transaction, target: TransactionStatus) -> None:
    """Raise ConstraintViolationException if the transition is illegal."""
    current = TransactionStatus(tx.status)
    if not current.can_transition_to(target):
        raise ConstraintViolationException(
            ConstraintDecision.deny(
                code=DecisionCode.INVALID_STATE_TRANSITION,
                message=(
                    f"Cannot transition transaction {tx.id} "
                    f"from {current.value} to {target.value}."
                ),
            )
        )


def _post_ledger_pair(
    db: Session,
    transaction_id: uuid.UUID,
    account_id: uuid.UUID | None,
    debit_balance_type: str,
    credit_balance_type: str,
    amount: int,
    currency: str,
    description: str,
) -> None:
    """Post a balanced (DEBIT + CREDIT) ledger pair atomically."""
    db.add(LedgerEntry(
        account_id=account_id,
        transaction_id=transaction_id,
        balance_type=debit_balance_type,
        entry_type="DEBIT",
        amount=amount,
        currency=currency,
        description=description,
    ))
    db.add(LedgerEntry(
        account_id=account_id,
        transaction_id=transaction_id,
        balance_type=credit_balance_type,
        entry_type="CREDIT",
        amount=amount,
        currency=currency,
        description=description,
    ))


# ─── State transitions ────────────────────────────────────────────────────────

def advance_to_processing(
    db: Session,
    transaction_id: uuid.UUID,
    user_id: uuid.UUID,
    provider_name: str,
    request_payload: str | None = None,
) -> Transaction:
    """
    PENDING → PROCESSING

    For debit operations: reserves funds (available → reserved).
    Creates a ProviderAttempt record.
    Returns (transaction, provider_request).
    """
    tx = _load_transaction_for_update(db, transaction_id, user_id)
    _assert_transition(tx, TransactionStatus.PROCESSING)

    tx_type = TransactionType(tx.type)

    # Reserve funds for debit operations
    if tx_type in TransactionType.debit_types() and tx_type in TransactionType.external_types():
        account = _load_account_for_update(db, tx.account_id)
        total_debit = tx.amount + tx.fee_amount
        if account.available_balance < total_debit:
            raise ConstraintViolationException(
                ConstraintDecision.deny(
                    code=DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS,
                    message=f"Cannot reserve: insufficient available funds.",
                )
            )
        account.available_balance -= total_debit
        account.reserved_balance += total_debit

        # Ledger: AVAILABLE DEBIT + RESERVED CREDIT (funds are held)
        _post_ledger_pair(
            db,
            tx.id,
            account.id,
            debit_balance_type="AVAILABLE",
            credit_balance_type="RESERVED",
            amount=total_debit,
            currency=tx.currency,
            description=f"Funds reserved for {tx_type.value}",
        )

    tx.status = TransactionStatus.PROCESSING.value
    tx.provider_name = provider_name

    record_audit(db, user_id, "TRANSACTION", tx.id, "TRANSACTION_PROCESSING",
                 "Transaction advanced to PROCESSING (funds reserved if debit)")
    return tx


def advance_to_completed(
    db: Session,
    transaction_id: uuid.UUID,
    user_id: uuid.UUID,
    provider_reference: str | None = None,
    response_payload: str | None = None,
    provider_attempt_id: uuid.UUID | None = None,
) -> Transaction:
    """
    PROCESSING → COMPLETED

    For FUND: posts AVAILABLE CREDIT (money lands).
    For SEND/PAY/WITHDRAW: posts RESERVED DEBIT + EXTERNAL CREDIT (money leaves).
    Updates ProviderAttempt to SUCCEEDED.
    """
    tx = _load_transaction_for_update(db, transaction_id, user_id)
    _assert_transition(tx, TransactionStatus.COMPLETED)

    tx_type = TransactionType(tx.type)
    account = _load_account_for_update(db, tx.account_id)

    if tx_type == TransactionType.FUND:
        # Credit arrives — post to available
        account.available_balance += tx.amount
        _post_ledger_pair(
            db, tx.id, account.id,
            debit_balance_type="EXTERNAL",
            credit_balance_type="AVAILABLE",
            amount=tx.amount,
            currency=tx.currency,
            description="Funds received",
        )

    elif tx_type in (TransactionType.SEND, TransactionType.PAY, TransactionType.WITHDRAW):
        total_debit = tx.amount + tx.fee_amount
        # Release reservation and post as external outbound
        account.reserved_balance -= total_debit
        _post_ledger_pair(
            db, tx.id, account.id,
            debit_balance_type="RESERVED",
            credit_balance_type="EXTERNAL",
            amount=total_debit,
            currency=tx.currency,
            description=f"{tx_type.value} completed",
        )

    tx.status = TransactionStatus.COMPLETED.value
    if provider_reference:
        tx.provider_reference = provider_reference

    # Update provider request record
    pr_query = db.query(ProviderAttempt).filter_by(transaction_id=tx.id)
    if provider_attempt_id:
        pr_query = pr_query.filter_by(id=provider_attempt_id)
    pr = pr_query.order_by(ProviderAttempt.created_at.desc()).first()
    if pr:
        pr.status = "SUCCEEDED"
        pr.provider_reference = provider_reference
        pr.response_payload = response_payload
        pr.responded_at = datetime.now(timezone.utc)

    record_audit(db, user_id, "TRANSACTION", tx.id, "TRANSACTION_COMPLETED",
                 f"Provider reference: {provider_reference}")
    return tx


def advance_to_failed(
    db: Session,
    transaction_id: uuid.UUID,
    user_id: uuid.UUID,
    failure_reason: str,
    provider_reference: str | None = None,
    response_payload: str | None = None,
    error_code: str | None = None,
) -> Transaction:
    """
    PENDING|PROCESSING → FAILED

    Releases any reserved funds back to available.
    Updates ProviderAttempt to FAILED.
    Does NOT post any ledger entries (money never moved for debit; nothing landed for credit).
    """
    tx = _load_transaction_for_update(db, transaction_id, user_id)
    _assert_transition(tx, TransactionStatus.FAILED)

    tx_type = TransactionType(tx.type)
    current_status = TransactionStatus(tx.status)

    # Release reserved funds if we had already reserved them
    if (
        current_status == TransactionStatus.PROCESSING
        and tx_type in TransactionType.debit_types()
        and tx_type in TransactionType.external_types()
        and tx.account_id
    ):
        account = _load_account_for_update(db, tx.account_id)
        total_debit = tx.amount + tx.fee_amount
        account.reserved_balance -= total_debit
        account.available_balance += total_debit

        # Ledger: RESERVED DEBIT + AVAILABLE CREDIT (funds released)
        _post_ledger_pair(
            db, tx.id, account.id,
            debit_balance_type="RESERVED",
            credit_balance_type="AVAILABLE",
            amount=total_debit,
            currency=tx.currency,
            description=f"Reservation released — {tx_type.value} failed",
        )

    tx.status = TransactionStatus.FAILED.value
    tx.failure_reason = failure_reason

    pr = db.query(ProviderAttempt).filter_by(transaction_id=tx.id).order_by(
        ProviderAttempt.created_at.desc()
    ).first()
    if pr:
        pr.status = "FAILED"
        pr.provider_reference = provider_reference
        pr.response_payload = response_payload
        pr.error_code = error_code
        pr.error_message = failure_reason
        pr.responded_at = datetime.now(timezone.utc)

    record_audit(db, user_id, "TRANSACTION", tx.id, "TRANSACTION_FAILED", failure_reason)
    return tx


def advance_to_cancelled(
    db: Session,
    transaction_id: uuid.UUID,
    user_id: uuid.UUID,
    reason: str = "Cancelled by user",
) -> Transaction:
    """
    PENDING|PROCESSING → CANCELLED

    Releases any reserved funds back to available.
    """
    tx = _load_transaction_for_update(db, transaction_id, user_id)
    _assert_transition(tx, TransactionStatus.CANCELLED)

    tx_type = TransactionType(tx.type)
    current_status = TransactionStatus(tx.status)

    if (
        current_status == TransactionStatus.PROCESSING
        and tx_type in TransactionType.debit_types()
        and tx_type in TransactionType.external_types()
        and tx.account_id
    ):
        account = _load_account_for_update(db, tx.account_id)
        total_debit = tx.amount + tx.fee_amount
        account.reserved_balance -= total_debit
        account.available_balance += total_debit

        _post_ledger_pair(
            db, tx.id, account.id,
            debit_balance_type="RESERVED",
            credit_balance_type="AVAILABLE",
            amount=total_debit,
            currency=tx.currency,
            description=f"Reservation released — {tx_type.value} cancelled",
        )

    tx.status = TransactionStatus.CANCELLED.value
    tx.failure_reason = reason

    pr = db.query(ProviderAttempt).filter_by(transaction_id=tx.id).order_by(
        ProviderAttempt.created_at.desc()
    ).first()
    if pr:
        pr.status = "FAILED"
        pr.error_message = reason
        pr.responded_at = datetime.now(timezone.utc)

    record_audit(db, user_id, "TRANSACTION", tx.id, "TRANSACTION_CANCELLED", reason)
    return tx


def advance_to_in_doubt(
    db: Session,
    transaction_id: uuid.UUID,
    user_id: uuid.UUID,
    reason: str = "Provider outcome unknown",
    error_code: str | None = None,
    provider_reference: str | None = None,
) -> Transaction:
    """
    PROCESSING → IN_DOUBT

    Called when a provider request was dispatched but no definitive response
    was received (network timeout, connection reset, ambiguous response).

    Critical semantics:
      - Funds remain RESERVED. They are NOT released.
      - No ledger entries are posted (no money has moved yet).
      - The transaction stays alive and requires resolution.
      - Resolution must come from: status_query, webhook, or manual reconciliation.

    Do NOT call advance_to_failed() as a substitute for this state.
    IN_DOUBT is not failure — it is uncertainty.
    """
    tx = _load_transaction_for_update(db, transaction_id, user_id)
    _assert_transition(tx, TransactionStatus.IN_DOUBT)

    tx.status = TransactionStatus.IN_DOUBT.value
    tx.failure_reason = reason
    if provider_reference:
        tx.provider_reference = provider_reference

    # Update the most recent ProviderAttempt to IN_DOUBT
    pr = db.query(ProviderAttempt).filter_by(transaction_id=tx.id).order_by(
        ProviderAttempt.created_at.desc()
    ).first()
    if pr:
        pr.status = "IN_DOUBT"
        pr.error_code = error_code
        pr.error_message = reason
        if provider_reference:
            pr.provider_reference = provider_reference
        pr.responded_at = datetime.now(timezone.utc)

    record_audit(
        db, user_id, "TRANSACTION", tx.id, "TRANSACTION_IN_DOUBT",
        f"IN_DOUBT: {reason} (funds remain reserved)"
    )
    return tx


def resolve_from_in_doubt(
    db: Session,
    transaction_id: uuid.UUID,
    user_id: uuid.UUID,
    succeeded: bool,
    provider_reference: str | None = None,
    response_payload: str | None = None,
    failure_reason: str | None = None,
    error_code: str | None = None,
) -> Transaction:
    """
    IN_DOUBT → COMPLETED or FAILED

    Called after the outcome of an IN_DOUBT operation is established via:
      - Provider status inquiry (status_query)
      - Webhook
      - Manual reconciliation

    If succeeded=True:
      - Post ledger entries as if the operation completed normally.
      - Release reserved funds appropriately.

    If succeeded=False:
      - Release reserved funds back to available.
      - No ledger debit entries.

    CRITICAL: This must be idempotent — calling it twice with the same
    result must not post the ledger twice.
    """
    tx = _load_transaction_for_update(db, transaction_id, user_id)
    current = TransactionStatus(tx.status)

    if current not in (TransactionStatus.IN_DOUBT,):
        # Already resolved — safe to return without error (idempotent)
        if current in TransactionStatus.terminal_states():
            return tx
        raise ConstraintViolationException(
            ConstraintDecision.deny(
                code=DecisionCode.INVALID_STATE_TRANSITION,
                message=(
                    f"resolve_from_in_doubt: transaction {tx.id} is in state "
                    f"{current.value}, expected IN_DOUBT."
                ),
            )
        )

    if succeeded:
        target = TransactionStatus.COMPLETED
    else:
        target = TransactionStatus.FAILED

    _assert_transition(tx, target)

    tx_type = TransactionType(tx.type)
    account = _load_account_for_update(db, tx.account_id)

    if succeeded:
        if tx_type == TransactionType.FUND:
            account.available_balance += tx.amount
            _post_ledger_pair(
                db, tx.id, account.id,
                debit_balance_type="EXTERNAL",
                credit_balance_type="AVAILABLE",
                amount=tx.amount,
                currency=tx.currency,
                description="Funds received (resolved from IN_DOUBT)",
            )
        elif tx_type in (TransactionType.SEND, TransactionType.PAY, TransactionType.WITHDRAW):
            total_debit = tx.amount + tx.fee_amount
            account.reserved_balance -= total_debit
            _post_ledger_pair(
                db, tx.id, account.id,
                debit_balance_type="RESERVED",
                credit_balance_type="EXTERNAL",
                amount=total_debit,
                currency=tx.currency,
                description=f"{tx_type.value} completed (resolved from IN_DOUBT)",
            )

        tx.status = TransactionStatus.COMPLETED.value
        if provider_reference:
            tx.provider_reference = provider_reference

        pr = db.query(ProviderAttempt).filter_by(transaction_id=tx.id).order_by(
            ProviderAttempt.created_at.desc()
        ).first()
        if pr:
            pr.status = "SUCCEEDED"
            pr.provider_reference = provider_reference
            pr.response_payload = response_payload
            pr.responded_at = datetime.now(timezone.utc)

        record_audit(
            db, user_id, "TRANSACTION", tx.id, "TRANSACTION_COMPLETED",
            f"Resolved from IN_DOUBT → COMPLETED (ref={provider_reference})"
        )

    else:
        # Release reserved funds (debit ops only)
        if (
            tx_type in TransactionType.debit_types()
            and tx_type in TransactionType.external_types()
            and tx.account_id
        ):
            total_debit = tx.amount + tx.fee_amount
            account.reserved_balance -= total_debit
            account.available_balance += total_debit
            _post_ledger_pair(
                db, tx.id, account.id,
                debit_balance_type="RESERVED",
                credit_balance_type="AVAILABLE",
                amount=total_debit,
                currency=tx.currency,
                description=f"Reservation released — {tx_type.value} failed (resolved from IN_DOUBT)",
            )

        tx.status = TransactionStatus.FAILED.value
        tx.failure_reason = failure_reason or "Operation failed (resolved from IN_DOUBT)"

        pr = db.query(ProviderAttempt).filter_by(transaction_id=tx.id).order_by(
            ProviderAttempt.created_at.desc()
        ).first()
        if pr:
            pr.status = "FAILED"
            pr.error_code = error_code
            pr.error_message = failure_reason
            pr.responded_at = datetime.now(timezone.utc)

        record_audit(
            db, user_id, "TRANSACTION", tx.id, "TRANSACTION_FAILED",
            f"Resolved from IN_DOUBT → FAILED: {failure_reason}"
        )

    return tx
