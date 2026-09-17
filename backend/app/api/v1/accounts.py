from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import uuid
from typing import List

from app.api.deps import SessionDep, CurrentUser
from app.models.account import Account

router = APIRouter(prefix="/accounts", tags=["accounts"])

class Money(BaseModel):
    amount_pesewas: int
    currency: str

class AccountResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    available_balance: Money
    reserved_balance: Money
    locked_balance: Money
    total_balance: Money

    @classmethod
    def from_orm_account(cls, account: Account):
        return cls(
            id=account.id,
            name=account.name,
            status=account.status,
            available_balance=Money(amount_pesewas=account.available_balance, currency=account.currency),
            reserved_balance=Money(amount_pesewas=account.reserved_balance, currency=account.currency),
            locked_balance=Money(amount_pesewas=account.locked_balance, currency=account.currency),
            total_balance=Money(amount_pesewas=account.available_balance + account.reserved_balance + account.locked_balance, currency=account.currency)
        )

@router.get("", response_model=List[AccountResponse])
def get_accounts(db: SessionDep, current_user: CurrentUser):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    return [AccountResponse.from_orm_account(acc) for acc in accounts]

@router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: uuid.UUID, db: SessionDep, current_user: CurrentUser):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail={"code": "ACCOUNT_NOT_FOUND", "message": "Account not found or access denied."})
    return AccountResponse.from_orm_account(account)

