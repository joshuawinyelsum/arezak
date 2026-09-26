import os
import re

p = 'backend/app/api/v1/transactions.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Add OutboundRequest
outbound = '''class OutboundRequest(BaseModel):
    account_id: uuid.UUID
    amount: Money
    type: str # TRANSFER_OUT, SPEND, WITHDRAW
    description: str | None = None
    destination: str | None = None
'''
c = c.replace('class ExpenseRequest(BaseModel):', outbound + '\nclass ExpenseRequest(BaseModel):')

# Add process_outbound import
c = c.replace('from app.services.transaction_service import process_income, process_expense', 'from app.services.transaction_service import process_income, process_expense, process_outbound')

# Add /outbound route
outbound_route = '''@router.post("/outbound", response_model=TransactionResponse)
def add_outbound(
    request: OutboundRequest, 
    db: SessionDep, 
    current_user: CurrentUser,
    idempotency_key: Annotated[str | None, Header()] = None
):
    try:
        tx = process_outbound(
            db=db,
            user_id=current_user.id,
            account_id=request.account_id,
            amount_pesewas=request.amount.amount_pesewas,
            currency=request.amount.currency,
            tx_type=request.type,
            description=request.description or "Outbound Transaction",
            destination=request.destination,
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
                "message": e.decision.message,
                "resource_type": e.decision.resource_type,
                "resource_id": e.decision.resource_id
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail={"code": "FINANCIAL_OPERATION_FAILED", "message": str(e)})
'''
c = c.replace('@router.post("/expense"', outbound_route + '\n@router.post("/expense"')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
