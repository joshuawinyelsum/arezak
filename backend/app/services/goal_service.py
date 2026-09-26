import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.goal import Goal
from app.models.goal_contribution import GoalContribution
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.ledger_entry import LedgerEntry
from app.rules.context import EvaluationContext
from app.rules.engine import engine
from app.rules.decision import ConstraintViolationException



def create_goal(db: Session, user_id: uuid.UUID, name: str, target_amount: int, icon: str | None = None, currency: str = "GHS", lock_type: str | None = None, unlock_date: datetime | None = None) -> Goal:
    if lock_type and lock_type not in ["TARGET_REACHED", "DATE_REACHED", "TARGET_AND_DATE", "BOTH"]:
        raise ValueError(f"Invalid lock_type: {lock_type}")

    goal = Goal(
        user_id=user_id,
        name=name,
        icon=icon,
        target_amount=target_amount,
        currency=currency,
        status="ACTIVE",
        lock_enabled=bool(lock_type),
        lock_type=lock_type,
        unlock_date=unlock_date
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

def contribute_to_goal(
    db: Session, 
    user_id: uuid.UUID, 
    account_id: uuid.UUID, 
    goal_id: uuid.UUID, 
    amount_pesewas: int, 
    currency: str = "GHS",
    idempotency_key: str | None = None
) -> Transaction:
    # 1. Idempotency Check (Fast path)
    if idempotency_key:
        existing_contrib = db.query(GoalContribution).filter_by(reference=idempotency_key, user_id=user_id).first()
        if existing_contrib:
            return existing_contrib.transaction
            
    # 1.5 Enforce single-account funding invariant
    existing_contrib = db.query(GoalContribution).filter_by(goal_id=goal_id).first()
    if existing_contrib and existing_contrib.account_id != account_id:
        raise ValueError("A goal can only be funded from a single account.")

    # 2. Constraint Engine Evaluation (Will lock account and goal, and verify constraints)
    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type="GOAL_CONTRIBUTION",
        amount_pesewas=amount_pesewas,
        currency=currency,
        account_id=account_id,
        goal_id=goal_id
    )
    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)
        
    # 3. Double-Checked Locking for Idempotency inside the row-lock
    if idempotency_key:
        existing_contrib = db.query(GoalContribution).filter_by(reference=idempotency_key, user_id=user_id).first()
        if existing_contrib:
            return existing_contrib.transaction
            
    account = context.account
    goal = context.goal
    
    # 4. Atomic Mutation
    # Decrease available, increase account locked
    account.available_balance -= amount_pesewas
    account.locked_balance += amount_pesewas
    
    # Increase goal saved and locked
    goal.current_amount += amount_pesewas
    goal.locked_amount += amount_pesewas
    
    # Check achievement transition
    if goal.current_amount == goal.target_amount:
        goal.status = "ACHIEVED"
        
    # Create main transaction
    transaction = Transaction(
        user_id=user_id,
        account_id=account_id,
        amount=amount_pesewas,
        currency=currency,
        type="GOAL_CONTRIBUTION",
        status="COMPLETED",
        reference=idempotency_key,
        description=f"Contribution to goal: {goal.name}"
    )
    db.add(transaction)
    db.flush() # get transaction id
    
    # Create ledger entry (Debit/Transfer Out equivalent representation for restriction)
    # The money didn't leave the bank, but it left the 'available' pool.
    ledger_entry = LedgerEntry(
        account_id=account_id,
        transaction_id=transaction.id,
        amount=amount_pesewas,
        currency=currency,
        entry_type="DEBIT"
    )
    db.add(ledger_entry)
    
    # Create GoalContribution record
    contribution = GoalContribution(
        goal_id=goal.id,
        account_id=account_id,
        user_id=user_id,
        transaction_id=transaction.id,
        amount=amount_pesewas,
        currency=currency,
        reference=idempotency_key
    )
    db.add(contribution)
    
    return transaction

def release_goal(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    goal_id: uuid.UUID,
    idempotency_key: str | None = None
) -> Transaction:
    # 1. Idempotency Check (Fast path)
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id, type="GOAL_RELEASE").first()
        if existing_tx:
            return existing_tx

    # 2. Constraint Engine Evaluation (Will lock account and goal, verify states)
    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type="GOAL_RELEASE",
        amount_pesewas=0, # Will be set by GoalReleaseConstraint based on database state
        currency="GHS", # Will be validated against Goal and Account
        account_id=account_id,
        goal_id=goal_id
    )
    
    account = db.query(Account).filter_by(id=account_id).first()
    if account:
        context.currency = account.currency

    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)
        
    # 3. Double-Checked Locking for Idempotency
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id, type="GOAL_RELEASE").first()
        if existing_tx:
            return existing_tx
            
    account = context.account
    goal = context.goal
    amount_pesewas = context.amount_pesewas # Extracted authoritatively by the constraint
    
    # 4. Atomic Mutation
    account.locked_balance -= amount_pesewas
    account.available_balance += amount_pesewas
    
    goal.locked_amount = 0
    goal.status = "RELEASED"
    
    transaction = Transaction(
        user_id=user_id,
        account_id=account_id,
        amount=amount_pesewas,
        currency=goal.currency,
        type="GOAL_RELEASE",
        status="COMPLETED",
        reference=idempotency_key,
        description=f"Released funds from goal: {goal.name}"
    )
    db.add(transaction)
    db.flush()
    
    ledger_entry = LedgerEntry(
        account_id=account_id,
        transaction_id=transaction.id,
        amount=amount_pesewas,
        currency=goal.currency,
        entry_type="RELEASE",
        description="Goal funds unlocked and made available"
    )
    db.add(ledger_entry)
    
    return transaction

def edit_goal(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    name: str | None = None,
    icon: str | None = None,
) -> Goal:
    goal = db.query(Goal).filter_by(id=goal_id, user_id=user_id).first()
    if not goal:
        raise ValueError('Goal not found')
        
            
    if name is not None:
        goal.name = name
        
    if icon is not None:
        goal.icon = icon
        
    db.commit()
    db.refresh(goal)
    return goal


def cancel_goal(
    db: Session,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    goal_id: uuid.UUID,
    idempotency_key: str | None = None
) -> Transaction:
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id, type='GOAL_CANCELLATION').first()
        if existing_tx:
            return existing_tx

    goal = db.query(Goal).filter_by(id=goal_id, user_id=user_id).first()
    if not goal:
        raise ValueError("Goal not found")

    context = EvaluationContext(
        db=db,
        user_id=user_id,
        operation_type='GOAL_CANCELLATION',
        amount_pesewas=goal.locked_amount,
        currency='GHS',
        account_id=account_id,
        goal_id=goal_id
    )
    
    account = db.query(Account).filter_by(id=account_id).first()
    if account:
        context.currency = account.currency

    decision = engine.evaluate(context)
    if not decision.allowed:
        raise ConstraintViolationException(decision)
        
    if idempotency_key:
        existing_tx = db.query(Transaction).filter_by(reference=idempotency_key, user_id=user_id, type='GOAL_CANCELLATION').first()
        if existing_tx:
            return existing_tx
            
    account = context.account
    goal = context.goal
    amount_pesewas = context.amount_pesewas
    
    account.locked_balance -= amount_pesewas
    account.available_balance += amount_pesewas
    
    goal.locked_amount = 0
    goal.status = 'CANCELLED'
    
    transaction = Transaction(
        user_id=user_id,
        account_id=account_id,
        amount=amount_pesewas,
        currency=goal.currency,
        type='GOAL_CANCELLATION',
        status='COMPLETED',
        reference=idempotency_key,
        description=f'Cancelled goal: {goal.name}'
    )
    db.add(transaction)
    db.flush()
    
    ledger_entry = LedgerEntry(
        account_id=account_id,
        transaction_id=transaction.id,
        amount=amount_pesewas,
        currency=goal.currency,
        entry_type='RELEASE',
        description='Goal cancelled and locked funds returned'
    )
    db.add(ledger_entry)
    
    return transaction


def delete_goal(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID
):
    goal = db.query(Goal).filter_by(id=goal_id, user_id=user_id).first()
    if not goal:
        raise ValueError('Goal not found')
        
    # Check for any financial history
    # A goal with no GoalContributions has never been funded, meaning it has no GOAL_CONTRIBUTION transactions.
    if goal.current_amount > 0:
        raise ValueError("This goal cannot be deleted because it contains locked funds. Reach the target before deleting or releasing the funds.")
        
    has_contributions = db.query(GoalContribution).filter_by(goal_id=goal_id).first() is not None
    if has_contributions or goal.locked_amount > 0 or goal.status != 'ACTIVE':
        raise ValueError('Goal has financial history and cannot be deleted. Archive it instead.')
        
    db.delete(goal)
    db.commit()








