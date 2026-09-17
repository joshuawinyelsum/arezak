from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
import uuid
from typing import Annotated, List
from datetime import datetime

from app.api.deps import SessionDep, CurrentUser
from app.services.transaction_service import process_income, process_expense
from app.models.transaction import Transaction
from app.models.ledger_entry import LedgerEntry
from app.rules.decision import ConstraintViolationException

router = APIRouter(prefix="/transactions", tags=["transactions"])

class Money(BaseModel):
    amount_pesewas: int
    currency: str

class IncomeRequest(BaseModel):
    account_id: uuid.UUID
    amount: Money
    description: str | None = None
    funding_source: str | None = None
    note: str | None = None

class ExpenseRequest(BaseModel):
    account_id: uuid.UUID
    amount: Money
    description: str | None = None

class TransactionResponse(BaseModel):
    id: uuid.UUID
    type: str
    amount: Money
    status: str
    description: str | None = None
    funding_source: str | None = None
    note: str | None = None
    created_at: datetime

    @classmethod
    def from_orm_transaction(cls, tx: Transaction):
        return cls(
            id=tx.id,
            type=tx.type,
            amount=Money(amount_pesewas=tx.amount, currency=tx.currency),
            status=tx.status,
            description=tx.description,
            funding_source=tx.funding_source,
            note=tx.note,
            created_at=tx.created_at
        )

class LedgerResponse(BaseModel):
    id: uuid.UUID
    entry_type: str
    amount: Money
    description: str | None = None
    created_at: datetime

    @classmethod
    def from_orm_ledger(cls, ledger: LedgerEntry):
        return cls(
            id=ledger.id,
            entry_type=ledger.entry_type,
            amount=Money(amount_pesewas=ledger.amount, currency=ledger.currency),
            description=ledger.description,
            created_at=ledger.created_at
        )

@router.post("/income", response_model=TransactionResponse)
def add_income(
    request: IncomeRequest, 
    db: SessionDep, 
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header()] = None
):
    try:
        tx = process_income(
            db, 
            current_user.id, 
            request.account_id, 
            request.amount.amount_pesewas, 
            request.amount.currency, 
            idempotency_key, 
            request.description or "Income",
            request.funding_source,
            request.note
        )
        db.commit()
        db.refresh(tx)
        return TransactionResponse.from_orm_transaction(tx)
    except ConstraintViolationException as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": e.decision.code,
                "message": e.decision.message,
                "resource_type": e.decision.resource_type,
                "resource_id": e.decision.resource_id
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail={"code": "FINANCIAL_OPERATION_FAILED", "message": "Failed to process transaction."})

@router.post("/expense", response_model=TransactionResponse)
def add_expense(
    request: ExpenseRequest, 
    db: SessionDep, 
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header()] = None
):
    try:
        tx = process_expense(db, current_user.id, request.account_id, request.amount.amount_pesewas, request.amount.currency, idempotency_key, request.description or "Expense")
        db.commit()
        db.refresh(tx)
        return TransactionResponse.from_orm_transaction(tx)
    except ConstraintViolationException as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": e.decision.code,
                "message": e.decision.message,
                "resource_type": e.decision.resource_type,
                "resource_id": e.decision.resource_id
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail={"code": "FINANCIAL_OPERATION_FAILED", "message": "Failed to process transaction."})

@router.get("", response_model=List[TransactionResponse])
def get_transactions(db: SessionDep, current_user: CurrentUser):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.created_at.desc()).limit(100).all()
    return [TransactionResponse.from_orm_transaction(tx) for tx in transactions]

@router.get("/{transaction_id}/ledger", response_model=List[LedgerResponse])
def get_transaction_ledger(transaction_id: uuid.UUID, db: SessionDep, current_user: CurrentUser):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail={"code": "TRANSACTION_NOT_FOUND", "message": "Transaction not found."})
    return [LedgerResponse.from_orm_ledger(entry) for entry in tx.ledger_entries]


class TransactionMetadataUpdate(BaseModel):
    description: str | None = None
    funding_source: str | None = None
    note: str | None = None

class TransactionCorrectionRequest(BaseModel):
    new_amount: Money

@router.patch('/{transaction_id}/metadata', response_model=TransactionResponse)
def api_update_transaction_metadata(
    transaction_id: uuid.UUID,
    request: TransactionMetadataUpdate,
    db: SessionDep,
    current_user: CurrentUser
):
    try:
        from app.services.transaction_service import update_transaction_metadata
        tx = update_transaction_metadata(
            db=db,
            user_id=current_user.id,
            transaction_id=transaction_id,
            description=request.description,
            funding_source=request.funding_source,
            note=request.note
        )
        return TransactionResponse.from_orm_transaction(tx)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post('/{transaction_id}/correct', response_model=TransactionResponse)
def api_correct_transaction(
    transaction_id: uuid.UUID,
    request: TransactionCorrectionRequest,
    db: SessionDep,
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header()] = None
):
    try:
        from app.services.transaction_service import correct_transaction
        tx = correct_transaction(
            db=db,
            user_id=current_user.id,
            transaction_id=transaction_id,
            new_amount_pesewas=request.new_amount.amount_pesewas,
            new_currency=request.new_amount.currency,
            idempotency_key=idempotency_key
        )
        db.commit()
        db.refresh(tx)
        return TransactionResponse.from_orm_transaction(tx)
    except ConstraintViolationException as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": e.decision.code,
                "message": e.decision.message
            }
        )
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

