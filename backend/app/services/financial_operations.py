"""
financial_operations.py
========================
The domain layer responsible for orchestrating legitimate financial operations.

Architecture:
  API
    ↓
  financial_operations  ← THIS MODULE
    ↓
  Rules / Validation (app.rules)
    ↓
  Transaction Lifecycle (app.services.transaction_lifecycle)
    ↓
  Money Movement Hub (app.services.money_movement_hub)

RULES:
  1. This module is the single entry point for all FUND/SEND/PAY/WITHDRAW.
  2. It NEVER directly mutates account balances.
  3. It delegates ALL rule checking to the rules engine.
  4. It calls transaction_lifecycle to reserve funds.
  5. It relies on MoneyMovementHub for async outbox dispatch.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.transaction import Transaction, TransactionType, TransactionStatus, DestinationType
from app.models.account import Account
from app.models.ledger_entry import LedgerEntry
from app.models.money_rail import MoneyRail
from app.providers.base import ProviderInterface
from app.providers.router import ProviderRouter
from app.rules import engine, EvaluationContext, ConstraintViolationException
from app.rules.codes import DecisionCode
from app.rules.decision import ConstraintDecision
from app.services.transaction_lifecycle import (
    advance_to_processing,
    advance_to_completed,
    advance_to_failed,
    advance_to_in_doubt,
)
from app.services.transaction_service import record_audit
from app.services.money_movement_hub import MoneyMovementHub


def _enqueue_external_operation(db: Session, tx: Transaction, payload: dict,
                                provider: ProviderInterface | None, rail: str) -> None:
    try:
        selected_rail = MoneyRail(rail)
    except ValueError as exc:
        raise ValueError(f"Unsupported money rail: {rail}") from exc
    router = None
    if provider is not None:
        router = ProviderRouter()
        router.register(selected_rail, provider)
    hub = MoneyMovementHub(router=router)
    hub.enqueue_operation(db, tx, rail=selected_rail.value, request_payload=payload)


def _create_fee_transaction(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    parent_tx_id: uuid.UUID,
    fee_amount: int,
    currency: str,
    description: str,
) -> Transaction | None:
    if fee_amount <= 0:
        return None

    fee_tx = Transaction(
        user_id=user_id,
        account_id=account_id,
        type=TransactionType.FEE,
        amount=fee_amount,
        currency=currency,
        status=TransactionStatus.COMPLETED.value,
        description=description,
        fee_for_transaction_id=parent_tx_id,
    )
    db.add(fee_tx)
    db.flush()
    return fee_tx


def _find_existing_by_idempotency(
    db: Session, idempotency_key: str, user_id: uuid.UUID,
    expected_type: str, expected_amount: int, expected_destination: str | None,
    *, currency: str = "GHS", account_id: uuid.UUID | None = None,
    fee_amount: int = 0, destination_type: str | None = None,
    note: str | None = None,
    rail: str | None = None,
) -> Transaction | None:
    tx = db.query(Transaction).filter_by(
        reference=idempotency_key, user_id=user_id
    ).first()
    if tx:
        if (tx.type != expected_type or tx.amount != expected_amount
                or tx.destination_address != expected_destination
                or tx.currency != currency or tx.fee_amount != fee_amount
                or (account_id is not None and tx.account_id != account_id)
                or (destination_type is not None and tx.destination_type != destination_type)
                or (note is not None and tx.note != note)
                or (rail is not None and tx.rail != rail)):
            raise ConstraintViolationException(
                ConstraintDecision.deny(
                    code=DecisionCode.CONSTRAINT_VIOLATION,
                    message="Idempotency key reused with different parameters."
                )
            )
        return tx
    return None


def _check_balance_for_debit(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    total_debit: int,
    currency: str,
    operation_type: str,
) -> Account:
    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type=operation_type,
        amount_pesewas=total_debit,
        currency=currency,
        account_id=account_id,
    )
    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)
    return context.account


def initiate_fund(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    amount_pesewas: int,
    currency: str = "GHS",
    source_address: str = "",
    source_type: str = DestinationType.EXTERNAL.value,
    idempotency_key: str | None = None,
    description: str | None = None,
    provider: ProviderInterface | None = None,
    rail: str = MoneyRail.SANDBOX.value,
) -> Transaction:
    if idempotency_key:
        existing = _find_existing_by_idempotency(
            db, idempotency_key, user_id, TransactionType.FUND, amount_pesewas,
            source_address, currency=currency, account_id=account_id,
            destination_type=source_type,
            rail=rail,
        )
        if existing:
            return existing

    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type="INCOME",
        amount_pesewas=amount_pesewas,
        currency=currency,
        account_id=account_id,
    )
    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)

    account = context.account

    tx = Transaction(
        user_id=user_id,
        account_id=account.id,
        type=TransactionType.FUND,
        amount=amount_pesewas,
        currency=currency,
        status=TransactionStatus.PENDING.value,
        reference=idempotency_key,
        description=description or "Fund account",
        funding_source=source_type,
        destination_type=source_type,
        destination_address=source_address,
        rail=rail,
    )
    db.add(tx)
    db.flush()

    record_audit(db, user_id, "TRANSACTION", tx.id, "TRANSACTION_PENDING",
                 f"Fund initiated from {source_type}:{source_address}")

    tx = advance_to_processing(db, tx.id, user_id, provider_name="UNKNOWN")

    _enqueue_external_operation(db, tx, {
        "source_address": source_address,
        "source_type": source_type
    }, provider, rail)
    
    db.commit()
    return tx


def initiate_send(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    amount_pesewas: int,
    currency: str = "GHS",
    destination_address: str = "",
    destination_type: str = DestinationType.MOBILE_MONEY.value,
    fee_pesewas: int = 0,
    idempotency_key: str | None = None,
    description: str | None = None,
    provider: ProviderInterface | None = None,
    rail: str = MoneyRail.SANDBOX.value,
) -> Transaction:
    if idempotency_key:
        existing = _find_existing_by_idempotency(
            db, idempotency_key, user_id, TransactionType.SEND, amount_pesewas,
            destination_address, currency=currency, account_id=account_id,
            fee_amount=fee_pesewas, destination_type=destination_type,
            rail=rail,
        )
        if existing:
            return existing

    total_debit = amount_pesewas + fee_pesewas

    account = _check_balance_for_debit(
        db, user_id, account_id, total_debit, currency, "SPEND"
    )

    try:
        DestinationType(destination_type)
    except ValueError:
        raise ConstraintViolationException(
            ConstraintDecision.deny(
                code=DecisionCode.CONSTRAINT_VIOLATION,
                message=f"Invalid destination_type: {destination_type!r}",
            )
        )

    tx = Transaction(
        user_id=user_id,
        account_id=account.id,
        type=TransactionType.SEND,
        amount=amount_pesewas,
        currency=currency,
        fee_amount=fee_pesewas,
        status=TransactionStatus.PENDING.value,
        reference=idempotency_key,
        description=description or "Send",
        destination_type=destination_type,
        destination_address=destination_address,
        rail=rail,
    )
    db.add(tx)
    db.flush()

    if fee_pesewas > 0:
        _create_fee_transaction(
            db, user_id, account.id, tx.id, fee_pesewas, currency,
            f"Fee for SEND {tx.id}"
        )

    record_audit(db, user_id, "TRANSACTION", tx.id, "TRANSACTION_PENDING", "Send initiated")

    tx = advance_to_processing(db, tx.id, user_id, provider_name="UNKNOWN")

    _enqueue_external_operation(db, tx, {
        "destination_address": destination_address,
        "destination_type": destination_type
    }, provider, rail)
    
    db.commit()
    return tx


def initiate_pay(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    amount_pesewas: int,
    currency: str = "GHS",
    merchant_code: str = "",
    service_type: str = "SERVICE",
    fee_pesewas: int = 0,
    idempotency_key: str | None = None,
    description: str | None = None,
    provider: ProviderInterface | None = None,
    rail: str = MoneyRail.SANDBOX.value,
) -> Transaction:
    if idempotency_key:
        existing = _find_existing_by_idempotency(
            db, idempotency_key, user_id, TransactionType.PAY, amount_pesewas,
            merchant_code, currency=currency, account_id=account_id,
            fee_amount=fee_pesewas, destination_type=DestinationType.MERCHANT.value,
            note=service_type, rail=rail,
        )
        if existing:
            return existing

    total_debit = amount_pesewas + fee_pesewas

    account = _check_balance_for_debit(
        db, user_id, account_id, total_debit, currency, "SPEND"
    )

    tx = Transaction(
        user_id=user_id,
        account_id=account.id,
        type=TransactionType.PAY,
        amount=amount_pesewas,
        currency=currency,
        fee_amount=fee_pesewas,
        status=TransactionStatus.PENDING.value,
        reference=idempotency_key,
        description=description or f"Pay {service_type}",
        destination_type=DestinationType.MERCHANT.value,
        destination_address=merchant_code,
        rail=rail,
        note=service_type,
    )
    db.add(tx)
    db.flush()

    if fee_pesewas > 0:
        _create_fee_transaction(
            db, user_id, account.id, tx.id, fee_pesewas, currency,
            f"Fee for PAY {tx.id}"
        )

    record_audit(db, user_id, "TRANSACTION", tx.id, "TRANSACTION_PENDING", "Pay initiated")

    tx = advance_to_processing(db, tx.id, user_id, provider_name="UNKNOWN")

    _enqueue_external_operation(db, tx, {
        "merchant_code": merchant_code,
        "service_type": service_type
    }, provider, rail)
    
    db.commit()
    return tx


def initiate_withdraw(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    amount_pesewas: int,
    currency: str = "GHS",
    destination_address: str = "",
    destination_type: str = DestinationType.EXTERNAL.value,
    fee_pesewas: int = 0,
    idempotency_key: str | None = None,
    description: str | None = None,
    provider: ProviderInterface | None = None,
    rail: str = MoneyRail.SANDBOX.value,
) -> Transaction:
    if idempotency_key:
        existing = _find_existing_by_idempotency(
            db, idempotency_key, user_id, TransactionType.WITHDRAW, amount_pesewas,
            destination_address, currency=currency, account_id=account_id,
            fee_amount=fee_pesewas, destination_type=destination_type,
            rail=rail,
        )
        if existing:
            return existing

    total_debit = amount_pesewas + fee_pesewas

    account = _check_balance_for_debit(
        db, user_id, account_id, total_debit, currency, "WITHDRAW"
    )

    tx = Transaction(
        user_id=user_id,
        account_id=account.id,
        type=TransactionType.WITHDRAW,
        amount=amount_pesewas,
        currency=currency,
        fee_amount=fee_pesewas,
        status=TransactionStatus.PENDING.value,
        reference=idempotency_key,
        description=description or "Withdraw",
        destination_type=destination_type,
        destination_address=destination_address,
        rail=rail,
    )
    db.add(tx)
    db.flush()

    if fee_pesewas > 0:
        _create_fee_transaction(
            db, user_id, account.id, tx.id, fee_pesewas, currency,
            f"Fee for WITHDRAW {tx.id}"
        )

    record_audit(db, user_id, "TRANSACTION", tx.id, "TRANSACTION_PENDING", "Withdraw initiated")

    tx = advance_to_processing(db, tx.id, user_id, provider_name="UNKNOWN")

    _enqueue_external_operation(db, tx, {
        "destination_address": destination_address,
        "destination_type": destination_type
    }, provider, rail)
    
    db.commit()
    return tx
