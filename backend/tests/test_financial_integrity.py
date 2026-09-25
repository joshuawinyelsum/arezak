import pytest
import uuid
from app.models.account import Account
from app.models.goal import Goal
from app.models.user import User
from app.models.transaction import Transaction
from app.models.ledger_entry import LedgerEntry

from app.models.goal_contribution import GoalContribution
from app.services.transaction_service import process_income, process_expense, correct_transaction, update_transaction_metadata
from app.services.goal_service import create_goal, contribute_to_goal, delete_goal
from sqlalchemy.orm import Session
from app.rules import ConstraintViolationException

@pytest.fixture
def test_user(db_session: Session):
    user = User(
        email=f"test_{uuid.uuid4()}@example.com",
        name="Test User",
        password_hash="password",
        currency="GHS"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_correction_atomicity(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Test Atomicity", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    
    tx1 = process_income(db_session, test_user.id, account.id, 100000, description="Initial")
    db_session.commit()
    
    assert account.available_balance == 100000
    
    tx2 = process_expense(db_session, test_user.id, account.id, 100000, description="Expense")
    db_session.commit()
    
    assert account.available_balance == 0
    
    # Attempt to correct tx2 to 200000. This should fail because available balance is 0.
    with pytest.raises(ConstraintViolationException):
        with db_session.begin_nested():
            correct_transaction(db_session, test_user.id, tx2.id, 200000)
            
    db_session.refresh(account)
    # verify NO new ledger entries
    ledgers = db_session.query(LedgerEntry).filter_by(account_id=account.id).all()
    assert len(ledgers) == 2
    transactions = db_session.query(Transaction).filter_by(account_id=account.id).all()
    assert len(transactions) == 2
    assert account.available_balance == 0

def test_correction_idempotency(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Test Idempotency", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    
    tx1 = process_income(db_session, test_user.id, account.id, 100000, description="Initial")
    db_session.commit()
    
    key = str(uuid.uuid4())
    ctx1 = correct_transaction(db_session, test_user.id, tx1.id, 80000, idempotency_key=key)
    db_session.commit()
    
    ctx2 = correct_transaction(db_session, test_user.id, tx1.id, 80000, idempotency_key=key)
    assert ctx1.id == ctx2.id
    
    txs = db_session.query(Transaction).filter_by(account_id=account.id).all()
    assert len(txs) == 3 # Original, Reversal, Replacement
    
def test_correction_lineage(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Test Lineage", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    
    tx1 = process_income(db_session, test_user.id, account.id, 100000, description="Initial")
    db_session.commit()
    
    ctx1 = correct_transaction(db_session, test_user.id, tx1.id, 80000)
    db_session.commit()
    
    db_session.refresh(tx1)
    reversal = db_session.query(Transaction).filter_by(reverses_transaction_id=tx1.id).first()
    assert reversal is not None
    assert reversal.type == 'CORRECTION_REVERSAL'
    assert reversal.amount == 100000
    
    assert ctx1.correction_of_transaction_id == tx1.id
    assert ctx1.amount == 80000
    
def test_correction_currency(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Test Currency", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    
    tx1 = process_income(db_session, test_user.id, account.id, 100000, description="Initial")
    db_session.commit()
    
    with pytest.raises(ValueError, match="Currency"):
        correct_transaction(db_session, test_user.id, tx1.id, 80000, new_currency="USD")
        
def test_correction_eligibility(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Test Elig", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    


    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, "Goal", 100000, icon="Test")
    db_session.commit()
    
    process_income(db_session, test_user.id, account.id, 100000)
    contrib = contribute_to_goal(db_session, test_user.id, account.id, goal.id, 1000)
    db_session.commit()
    
    with pytest.raises(ValueError, match="Only income and expense"):
        correct_transaction(db_session, test_user.id, contrib.id, 500)

def test_metadata_editing(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Test Meta", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    


    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, "Goal", 100000, icon="Test")
    db_session.commit()
    
    process_income(db_session, test_user.id, account.id, 100000)
    contrib = contribute_to_goal(db_session, test_user.id, account.id, goal.id, 1000)
    db_session.commit()
    
    with pytest.raises(ValueError, match="Only user-entered"):
        update_transaction_metadata(db_session, test_user.id, contrib.id, note="Hey")
        
def test_goal_account_invariant(db_session: Session, test_user):
    account1 = Account(user_id=test_user.id, name="A1", type="MAIN", currency="GHS")
    account2 = Account(user_id=test_user.id, name="A2", type="MAIN", currency="GHS")
    db_session.add_all([account1, account2])
    db_session.commit()
    
    process_income(db_session, test_user.id, account1.id, 10000)
    process_income(db_session, test_user.id, account2.id, 10000)
    


    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, "Goal", 100000, icon="Test")
    
    contribute_to_goal(db_session, test_user.id, account1.id, goal.id, 100)
    db_session.commit()
    
    with pytest.raises(ValueError, match="single account"):
        contribute_to_goal(db_session, test_user.id, account2.id, goal.id, 100)
        
def test_goal_deletion(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="D1", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    


    db_session.commit()
    
    goal1 = create_goal(db_session, test_user.id, "G1", 10000, icon="Test")
    db_session.commit()
    delete_goal(db_session, test_user.id, goal1.id) # Should succeed
    
    process_income(db_session, test_user.id, account.id, 10000)
    goal2 = create_goal(db_session, test_user.id, "G2", 10000, icon="Test")
    contribute_to_goal(db_session, test_user.id, account.id, goal2.id, 100)
    with pytest.raises(ValueError):
        delete_goal(db_session, test_user.id, goal2.id)

    db_session.commit()
from app.services.goal_service import edit_goal, delete_goal
from app.models.goal import Goal


def test_goal_editing(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Main", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    
    process_income(db_session, test_user.id, account.id, 500000)
    goal = create_goal(db_session, test_user.id, "Goal Edit", 10000, icon="Test")
    contribute_to_goal(db_session, test_user.id, account.id, goal.id, 2000)
    db_session.commit()
    
    # Invalid: lowering below current amount
    with pytest.raises(ValueError, match="Target amount cannot be lower than the amount already locked in this goal"):
        with db_session.begin_nested():
            edit_goal(db_session, test_user.id, goal.id, target_amount=1000)
            
    # Valid: increasing amount
    edit_goal(db_session, test_user.id, goal.id, target_amount=20000)
    db_session.refresh(goal)
    assert goal.target_amount == 20000
    assert goal.current_amount == 2000
    
    # Test achieved/released/cancelled cannot edit financial target
    goal.status = "ACHIEVED"
    db_session.commit()
    
    with pytest.raises(ValueError, match="Cannot edit target amount for ACHIEVED goal"):
        edit_goal(db_session, test_user.id, goal.id, target_amount=600000)

def test_fund_account_and_idempotency(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Fund Acc", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    
    key = str(uuid.uuid4())
    
    tx1 = process_income(db_session, test_user.id, account.id, 50000, idempotency_key=key)
    db_session.commit()
    
    assert tx1.type == "INCOME"
    assert account.available_balance == 50000
    assert account.locked_balance == 0
    assert account.reserved_balance == 0
    assert account.total_balance == 50000
    
    tx2 = process_income(db_session, test_user.id, account.id, 50000, idempotency_key=key)
    assert tx2.id == tx1.id
    
    # validation
    with pytest.raises(ConstraintViolationException, match="Amount must be greater than zero"):
        process_income(db_session, test_user.id, account.id, 0)
        
def test_cross_user_isolation(db_session: Session, test_user):
    user_b = User(email=f"b_{uuid.uuid4()}@example.com", name="User B", password_hash="pass", currency="GHS")
    db_session.add(user_b)
    db_session.commit()
    db_session.refresh(user_b)
    
    account_a = Account(user_id=test_user.id, name="A", type="MAIN", currency="GHS")
    db_session.add(account_a)
    db_session.commit()
    


    db_session.commit()
    
    goal_a = create_goal(db_session, test_user.id, "G", 1000, icon="Test")
    tx_a = process_income(db_session, test_user.id, account_a.id, 1000)
    db_session.commit()
    
    # B tries to use A's account
    with pytest.raises(ConstraintViolationException):
        process_expense(db_session, user_b.id, account_a.id, 100)
        
    # B tries to correct A's transaction
    with pytest.raises(ValueError, match="not found"):
        correct_transaction(db_session, user_b.id, tx_a.id, 500)




