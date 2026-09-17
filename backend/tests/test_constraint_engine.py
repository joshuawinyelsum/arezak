import pytest
import uuid
import threading
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.account import Account
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.rules import engine, EvaluationContext, DecisionCode

def setup_test_data(db_session: Session):
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"{user_id}@test.com",
        name="Test User",
        password_hash="hash",
        currency="GHS",
        timezone="UTC"
    )
    db_session.add(user)
    
    account_id = uuid.uuid4()
    account = Account(
        id=account_id,
        user_id=user_id,
        type="MAIN",
        name="Main Account",
        currency="GHS",
        available_balance=100000, # GH₵1,000.00
        reserved_balance=0,
        locked_balance=0
    )
    db_session.add(account)
    db_session.commit()
    return user_id, account_id

def test_available_balance_constraint_allow(db_session: Session):
    user_id, account_id = setup_test_data(db_session)
    
    ctx = EvaluationContext(
        db=db_session,
        user_id=user_id,
        operation_type="SPEND",
        amount_pesewas=50000, # GH₵500
        currency="GHS",
        account_id=account_id
    )
    decision = engine.evaluate(ctx)
    assert decision.allowed is True
    assert decision.code == DecisionCode.ALLOWED

def test_insufficient_available_funds(db_session: Session):
    user_id, account_id = setup_test_data(db_session)
    
    ctx = EvaluationContext(
        db=db_session,
        user_id=user_id,
        operation_type="SPEND",
        amount_pesewas=200000, # GH₵2,000
        currency="GHS",
        account_id=account_id
    )
    decision = engine.evaluate(ctx)
    assert decision.allowed is False
    assert decision.code == DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS

def test_macbook_goal_lock_scenario(db_session: Session):
    user_id, account_id = setup_test_data(db_session)
    
    # Setup Macbook goal lock representation
    account = db_session.get(Account, account_id)
    account.available_balance = 30000 # GH₵300 available
    account.locked_balance = 70000 # GH₵700 locked for Macbook
    db_session.commit()
    
    # Attempt to spend 500
    ctx = EvaluationContext(
        db=db_session,
        user_id=user_id,
        operation_type="SPEND",
        amount_pesewas=50000,
        currency="GHS",
        account_id=account_id
    )
    decision = engine.evaluate(ctx)
    assert decision.allowed is False
    assert decision.code == DecisionCode.FUNDS_LOCKED
    assert "locked" in decision.message

def test_invalid_amount(db_session: Session):
    user_id, account_id = setup_test_data(db_session)
    ctx = EvaluationContext(
        db=db_session,
        user_id=user_id,
        operation_type="SPEND",
        amount_pesewas=-500,
        currency="GHS",
        account_id=account_id
    )
    decision = engine.evaluate(ctx)
    assert decision.allowed is False
    assert decision.code == DecisionCode.INVALID_AMOUNT

def test_mixed_available_locked_spending(db_session: Session):
    user_id, account_id = setup_test_data(db_session)
    account = db_session.get(Account, account_id)
    account.available_balance = 40000 # GH₵400
    account.locked_balance = 60000 # GH₵600
    db_session.commit()
    
    # Attempt 500
    ctx = EvaluationContext(
        db=db_session,
        user_id=user_id,
        operation_type="SPEND",
        amount_pesewas=50000,
        currency="GHS",
        account_id=account_id
    )
    decision = engine.evaluate(ctx)
    assert decision.allowed is False
    assert decision.code == DecisionCode.FUNDS_LOCKED

def test_no_negative_available_balance(db_session: Session):
    user_id, account_id = setup_test_data(db_session)
    ctx = EvaluationContext(
        db=db_session,
        user_id=user_id,
        operation_type="SPEND",
        amount_pesewas=100001,
        currency="GHS",
        account_id=account_id
    )
    decision = engine.evaluate(ctx)
    assert decision.allowed is False
    assert decision.code == DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS

def test_idempotent_constraint_evaluation(db_session: Session):
    user_id, account_id = setup_test_data(db_session)
    from app.services.transaction_service import process_expense
    
    # First request
    tx1 = process_expense(
        db=db_session,
        user_id=user_id,
        account_id=account_id,
        amount_pesewas=10000,
        currency="GHS",
        idempotency_key="idemp-test-123"
    )
    db_session.commit()
    
    # Second identical request
    tx2 = process_expense(
        db=db_session,
        user_id=user_id,
        account_id=account_id,
        amount_pesewas=10000,
        currency="GHS",
        idempotency_key="idemp-test-123"
    )
    
    assert tx1.id == tx2.id
    
    # Verify balance was only mutated once
    account = db_session.get(Account, account_id)
    assert account.available_balance == 90000 # 100000 - 10000
