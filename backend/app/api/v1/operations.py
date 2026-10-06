"""
api/v1/operations.py
====================
Thin API layer for Block 2 financial domain operations: Fund, Send, Pay, Withdraw.

Rules:
  - No balance mutation here.
  - No ledger entries here.
  - No provider-specific logic here.
  - Call financial_operations service and return structured responses.

Each endpoint accepts an Idempotency-Key header for safe retry behavior.
"""
from __future__ import annotations

import uuid
import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import SessionDep, CurrentUser
from app.models.transaction import Transaction, TransactionStatus, DestinationType
from app.models.provider_attempt import ProviderAttempt
from app.models.money_rail import MoneyRail
from app.providers.base import ProviderRoutingError
from app.rules.decision import ConstraintViolationException
from app.services.rail_resolver import RailResolutionError
from app.services.financial_operations import (
    initiate_fund,
    initiate_send,
    initiate_pay,
    initiate_withdraw,
)
from app.services.internal_transfer import initiate_internal_transfer
from app.services.recipient_identity import InvalidRecipientIdentifier, RecipientNotFound, resolve_recipient

router = APIRouter(prefix="/operations", tags=["financial-operations"])
logger = logging.getLogger(__name__)


# ─── Shared schemas ───────────────────────────────────────────────────────────

class Money(BaseModel):
    amount_pesewas: int
    currency: str = "GHS"


class OperationResponse(BaseModel):
    """Returned by every domain operation initiation."""
    transaction_id: uuid.UUID
    type: str
    status: str
    amount: Money
    fee: Money
    total_debit: Money
    destination_type: str | None = None
    destination_address: str | None = None
    rail: str | None = None
    provider_name: str | None = None
    provider_reference: str | None = None
    description: str | None = None
    created_at: datetime

    @classmethod
    def from_tx(cls, tx: Transaction) -> "OperationResponse":
        return cls(
            transaction_id=tx.id,
            type=tx.type,
            status=tx.status,
            amount=Money(amount_pesewas=tx.amount, currency=tx.currency),
            fee=Money(amount_pesewas=tx.fee_amount, currency=tx.currency),
            total_debit=Money(
                amount_pesewas=tx.amount + tx.fee_amount, currency=tx.currency
            ),
            destination_type=tx.destination_type,
            destination_address=tx.destination_address,
            rail=tx.rail,
            provider_name=tx.provider_name,
            provider_reference=tx.provider_reference,
            description=tx.description,
            created_at=tx.created_at,
        )


class ProviderAttemptResponse(BaseModel):
    id: uuid.UUID
    provider_name: str
    operation: str
    status: str
    provider_reference: str | None
    amount_pesewas: int
    error_code: str | None
    error_message: str | None
    dispatched_at: datetime | None
    responded_at: datetime | None

    @classmethod
    def from_attempt(cls, pr: ProviderAttempt) -> "ProviderAttemptResponse":
        return cls(
            id=pr.id,
            provider_name=pr.provider_code,
            operation=pr.operation,
            status=pr.status,
            provider_reference=pr.provider_reference,
            amount_pesewas=pr.amount_pesewas,
            error_code=pr.error_code,
            error_message=pr.error_message,
            dispatched_at=pr.dispatched_at,
            responded_at=pr.responded_at,
        )


def _handle_error(e: Exception) -> HTTPException:
    if isinstance(e, ConstraintViolationException):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": e.decision.code,
                "message": e.decision.message,
            },
        )
    if isinstance(e, ProviderRoutingError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "PROVIDER_UNAVAILABLE", "message": "No provider is configured for the selected rail."},
        )
    if isinstance(e, RailResolutionError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_DESTINATION_OR_RAIL", "message": str(e)},
        )
    if isinstance(e, ValueError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_OPERATION", "message": str(e)},
        )
    logger.exception("Unhandled financial operation failure")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={"code": "OPERATION_FAILED", "message": "The operation could not be completed."},
    )


# ─── Fee preview ──────────────────────────────────────────────────────────────

class FeePreviewResponse(BaseModel):
    amount_pesewas: int
    fee_pesewas: int
    total_debit_pesewas: int
    currency: str
    operation_type: str
    note: str


@router.get("/fees/preview")
def preview_fees(
    operation_type: str,
    amount_pesewas: int,
    destination_type: str = DestinationType.MOBILE_MONEY.value,
) -> FeePreviewResponse:
    """
    Return fee information for a prospective operation without creating any transaction.

    Block 2: fee calculation is zero (no live provider).
    Block 3: this endpoint will call the provider's fee API.
    """
    # Validate operation type
    valid_ops = {"FUND", "SEND", "PAY", "WITHDRAW"}
    if operation_type not in valid_ops:
        raise HTTPException(
            status_code=400,
            detail={"code": "OPERATION_NOT_SUPPORTED",
                    "message": f"operation_type must be one of {valid_ops}"},
        )
    if amount_pesewas <= 0:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_AMOUNT", "message": "amount_pesewas must be > 0"},
        )

    # Sandbox / Block 2: fees are zero
    fee = 0
    return FeePreviewResponse(
        amount_pesewas=amount_pesewas,
        fee_pesewas=fee,
        total_debit_pesewas=amount_pesewas + fee,
        currency="GHS",
        operation_type=operation_type,
        note="SANDBOX: No live provider connected. Fees are zero.",
    )


# ─── FUND ─────────────────────────────────────────────────────────────────────

class FundRequest(BaseModel):
    account_id: uuid.UUID
    amount: Money
    source_address: str = Field(default="", description="Phone number, bank account, etc.")
    source_type: str = Field(default=DestinationType.MOBILE_MONEY.value)
    rail: MoneyRail = MoneyRail.SANDBOX
    description: str | None = None


@router.post("/fund", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
def api_fund(
    request: FundRequest,
    db: SessionDep,
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    """Fund the account from an external source (sandbox mode — no real network call)."""
    try:
        tx = initiate_fund(
            db=db,
            user_id=current_user.id,
            account_id=request.account_id,
            amount_pesewas=request.amount.amount_pesewas,
            currency=request.amount.currency,
            source_address=request.source_address,
            source_type=request.source_type,
            idempotency_key=idempotency_key,
            description=request.description,
            rail=request.rail.value,
        )
        db.refresh(tx)
        return OperationResponse.from_tx(tx)
    except Exception as e:
        db.rollback()
        raise _handle_error(e)


# ─── SEND ─────────────────────────────────────────────────────────────────────

class SendRequest(BaseModel):
    account_id: uuid.UUID
    amount: Money
    destination_address: str = Field(description="Phone number, bank account, Arezak user ID, etc.")
    destination_type: str = Field(default=DestinationType.MOBILE_MONEY.value)
    rail: MoneyRail = MoneyRail.SANDBOX
    fee_pesewas: int = Field(default=0, ge=0)
    description: str | None = None


@router.post("/send", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
def api_send(
    request: SendRequest,
    db: SessionDep,
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    """Send money to another person or account."""
    try:
        if request.destination_type == DestinationType.AREZAK_USER.value:
            raise ValueError("Use the Arezak recipient transfer flow for internal recipients.")
        tx = initiate_send(
            db=db,
            user_id=current_user.id,
            account_id=request.account_id,
            amount_pesewas=request.amount.amount_pesewas,
            currency=request.amount.currency,
            destination_address=request.destination_address,
            destination_type=request.destination_type,
            fee_pesewas=request.fee_pesewas,
            idempotency_key=idempotency_key,
            description=request.description,
            rail=request.rail.value,
        )
        db.refresh(tx)
        return OperationResponse.from_tx(tx)
    except Exception as e:
        db.rollback()
        raise _handle_error(e)


class InternalTransferRequest(BaseModel):
    account_id: uuid.UUID
    recipient_identifier: str = Field(min_length=1, max_length=255)
    amount: Money
    note: str | None = Field(default=None, max_length=500)


@router.post("/internal-transfer", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
def api_internal_transfer(
    request: InternalTransferRequest,
    db: SessionDep,
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    """Resolve a receiving identifier, then transfer to its canonical account."""
    try:
        if not idempotency_key:
            raise ValueError("An Idempotency-Key header is required for Arezak transfers.")
        identity = resolve_recipient(db, request.recipient_identifier)
        tx = initiate_internal_transfer(
            db,
            user_id=current_user.id,
            source_account_id=request.account_id,
            recipient_account_id=identity.account_id,
            amount_pesewas=request.amount.amount_pesewas,
            currency=request.amount.currency,
            idempotency_key=idempotency_key,
            note=request.note,
        )
        db.commit()
        db.refresh(tx)
        return OperationResponse.from_tx(tx)
    except InvalidRecipientIdentifier as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RecipientNotFound as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise _handle_error(exc)


# ─── PAY ─────────────────────────────────────────────────────────────────────

class PayRequest(BaseModel):
    account_id: uuid.UUID
    amount: Money
    merchant_code: str = Field(description="Merchant/biller identifier")
    service_type: str = Field(default="SERVICE",
                               description="e.g. AIRTIME, DATA, ELECTRICITY, WATER, TV, SERVICE")
    rail: MoneyRail = MoneyRail.SANDBOX
    fee_pesewas: int = Field(default=0, ge=0)
    description: str | None = None


@router.post("/pay", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
def api_pay(
    request: PayRequest,
    db: SessionDep,
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    """Pay a merchant, bill, or service."""
    try:
        tx = initiate_pay(
            db=db,
            user_id=current_user.id,
            account_id=request.account_id,
            amount_pesewas=request.amount.amount_pesewas,
            currency=request.amount.currency,
            merchant_code=request.merchant_code,
            service_type=request.service_type,
            fee_pesewas=request.fee_pesewas,
            idempotency_key=idempotency_key,
            description=request.description,
            rail=request.rail.value,
        )
        db.refresh(tx)
        return OperationResponse.from_tx(tx)
    except Exception as e:
        db.rollback()
        raise _handle_error(e)


# ─── WITHDRAW ─────────────────────────────────────────────────────────────────

class WithdrawRequest(BaseModel):
    account_id: uuid.UUID
    amount: Money
    destination_address: str = Field(default="", description="Bank account, phone for agent cash-out, etc.")
    destination_type: str = Field(default=DestinationType.EXTERNAL.value)
    rail: MoneyRail = MoneyRail.SANDBOX
    fee_pesewas: int = Field(default=0, ge=0)
    description: str | None = None


@router.post("/withdraw", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
def api_withdraw(
    request: WithdrawRequest,
    db: SessionDep,
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    """Withdraw from Arezak available balance to an external destination."""
    try:
        tx = initiate_withdraw(
            db=db,
            user_id=current_user.id,
            account_id=request.account_id,
            amount_pesewas=request.amount.amount_pesewas,
            currency=request.amount.currency,
            destination_address=request.destination_address,
            destination_type=request.destination_type,
            fee_pesewas=request.fee_pesewas,
            idempotency_key=idempotency_key,
            description=request.description,
            rail=request.rail.value,
        )
        db.refresh(tx)
        return OperationResponse.from_tx(tx)
    except Exception as e:
        db.rollback()
        raise _handle_error(e)


# ─── Provider tracing ─────────────────────────────────────────────────────────

@router.get("/{transaction_id}/provider-requests", response_model=list[ProviderAttemptResponse])
def get_provider_attempts(
    transaction_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser,
):
    """
    Return all provider call records for a transaction.
    This is the reconciliation entry point — maps Arezak tx to provider references.
    """
    from app.models.transaction import Transaction
    tx = db.query(Transaction).filter_by(
        id=transaction_id, user_id=current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail={"code": "TRANSACTION_NOT_FOUND",
                                                      "message": "Transaction not found."})
    return [ProviderAttemptResponse.from_attempt(attempt) for attempt in tx.provider_attempts]
