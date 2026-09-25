from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime
from typing import Annotated

from app.api.deps import SessionDep, CurrentUser
from app.services.goal_service import create_goal, contribute_to_goal
from app.models.goal import Goal
from app.models.account import Account
from app.rules.decision import ConstraintViolationException

router = APIRouter(prefix="/goals", tags=["goals"])

class GoalCreate(BaseModel):
    name: str
    icon: str | None = None
    target_amount: int
    currency: str = "GHS"
    description: str | None = None
    lock_type: str | None = None
    unlock_date: datetime | None = None

class ContributeRequest(BaseModel):
    amount: int
    account_id: uuid.UUID

class GoalResponse(BaseModel):
    id: uuid.UUID
    name: str
    icon: str | None = None
    target_amount: int
    current_amount: int
    locked_amount: int
    currency: str
    status: str
    lock_type: str | None = None
    unlock_date: datetime | None = None
    target_reached: bool = False
    date_reached: bool = False
    is_eligible_for_release: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

@router.post("", response_model=GoalResponse)
def api_create_goal(request: GoalCreate, db: SessionDep, current_user: CurrentUser):
    if request.target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be > 0")
        
    try:
        return create_goal(
            db=db,
            user_id=current_user.id,
            name=request.name,
            icon=request.icon,
            target_amount=request.target_amount,
            currency=request.currency,
            lock_type=request.lock_type,
            unlock_date=request.unlock_date
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=list[GoalResponse])
def get_goals(db: SessionDep, current_user: CurrentUser):
    return db.query(Goal).filter(Goal.user_id == current_user.id).order_by(Goal.created_at.desc()).all()

@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: uuid.UUID, db: SessionDep, current_user: CurrentUser):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.post("/{goal_id}/contributions")
def api_contribute_to_goal(
    goal_id: uuid.UUID,
    request: ContributeRequest,
    db: SessionDep,
    current_user: CurrentUser,
    x_idempotency_key: Annotated[str | None, Header()] = None
):
    try:
        tx = contribute_to_goal(
            db=db, 
            user_id=current_user.id, 
            account_id=request.account_id,
            goal_id=goal_id, 
            amount_pesewas=request.amount,
            idempotency_key=x_idempotency_key
        )
        db.commit()
        return {"message": "Contribution successful", "transaction_id": tx.id}
    except ConstraintViolationException as e:
        db.rollback()
        status = 400
        if "NOT_FOUND" in e.decision.code or "DENIED" in e.decision.code or "NOT_OWNED" in e.decision.code:
            status = 404 # To obscure existence or standard 404
        raise HTTPException(status_code=status, detail=e.decision.message)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
@router.post("/{goal_id}/release")
def api_release_goal(
    goal_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser,
    x_idempotency_key: Annotated[str | None, Header()] = None
):
    # Determine the account ID from the goal's contribution. 
    # For Phase 2C-1, we assume goals are tied to accounts through contributions.
    # To keep the API simple, we'll fetch the goal's account_id from its first contribution,
    # or just assume the user passes it. The prompt says:
    # "Do not let the client arbitrarily redirect released funds to another account... The release should operate against the account that actually contains the goal's locked funds."
    # Let's find the account_id from GoalContribution.
    
    from app.models.goal_contribution import GoalContribution
    contrib = db.query(GoalContribution).filter_by(goal_id=goal_id).first()
    if not contrib:
        raise HTTPException(status_code=400, detail="Goal has no contributions to release to.")
        
    try:
        from app.services.goal_service import release_goal
        tx = release_goal(
            db=db,
            user_id=current_user.id,
            account_id=contrib.account_id,
            goal_id=goal_id,
            idempotency_key=x_idempotency_key
        )
        db.commit()
        
        goal = db.query(Goal).filter_by(id=goal_id).first()
        account = db.query(Account).filter_by(id=contrib.account_id).first()
        
        return {
            "message": "Release successful", 
            "transaction_id": tx.id,
            "goal_status": goal.status,
            "released_amount": tx.amount,
            "remaining_locked_amount": goal.locked_amount,
            "account_available_balance": account.available_balance,
            "account_locked_balance": account.locked_balance
        }
    except ConstraintViolationException as e:
        db.rollback()
        status = 400
        if "NOT_FOUND" in e.decision.code or "DENIED" in e.decision.code or "NOT_OWNED" in e.decision.code:
            status = 404
        raise HTTPException(status_code=status, detail=e.decision.message)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

class GoalEditRequest(BaseModel):
    name: str | None = None
    icon: str | None = None
    target_amount: int | None = None

@router.patch('/{goal_id}', response_model=GoalResponse)
def api_edit_goal(
    goal_id: uuid.UUID,
    request: GoalEditRequest,
    db: SessionDep,
    current_user: CurrentUser
):
    try:
        from app.services.goal_service import edit_goal
        goal = edit_goal(
            db=db,
            user_id=current_user.id,
            goal_id=goal_id,
            name=request.name,
            icon=request.icon,
            target_amount=request.target_amount
        )
        return goal
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete('/{goal_id}')
def api_delete_goal(
    goal_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser
):
    try:
        from app.services.goal_service import delete_goal
        delete_goal(db=db, user_id=current_user.id, goal_id=goal_id)
        return {'message': 'Goal deleted successfully'}
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{goal_id}/archive")
def api_archive_goal(
    goal_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser
):
    from app.models.goal import Goal
    goal = db.query(Goal).filter_by(id=goal_id, user_id=current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    if goal.status not in ["RELEASED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Only released or cancelled goals can be archived.")
        
    goal.status = "ARCHIVED"
    db.commit()
    return {"message": "Goal archived successfully"}



