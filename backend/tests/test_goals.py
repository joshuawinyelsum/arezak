import pytest
import uuid
import threading
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.goal import Goal
from app.rules.decision import ConstraintViolationException
from app.rules.codes import DecisionCode
from app.services.goal_service import create_goal, contribute_to_goal
from app.services.transaction_service import process_income
from app.models.user import User

@pytest.fixture
def test_user(db_session: Session):
    user = User(email=f"test_{uuid.uuid4()}@example.com", name="Test User", password_hash="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_account(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Main", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account

@pytest.fixture
def test_user_2(db_session: Session):
    user = User(email=f"test2_{uuid.uuid4()}@example.com", name="Test User 2", password_hash="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_account_2(db_session: Session, test_user_2):
    account = Account(user_id=test_user_2.id, name="Main 2", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account

def test_goal_creation_and_ownership(db_session: Session, test_user, test_account):
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    assert goal.target_amount == 10000
    assert goal.current_amount == 0
    assert goal.locked_amount == 0
    assert goal.user_id == test_user.id
    assert goal.status == "ACTIVE"
    
def test_valid_contribution_flow(db_session: Session, test_user, test_account):
    # Setup initial funds
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "init1")
    db_session.commit()
    db_session.refresh(test_account)
    
    assert test_account.available_balance == 50000
    goal = create_goal(db_session, test_user.id, "MacBook", 100000)
    
    # Contribute 20000
    tx = contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 20000, "GHS", "contrib1")
    db_session.commit()
    
    db_session.refresh(test_account)
    db_session.refresh(goal)
    
    assert goal.current_amount == 20000
    assert goal.locked_amount == 20000
    assert test_account.locked_balance == 20000
    assert test_account.available_balance == 30000
    assert test_account.total_balance == 50000 # Invariant: total balance remains unchanged
    
def test_contribution_exceeds_available(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 5000, "GHS", "init2")
    db_session.commit()
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    
    with pytest.raises(ConstraintViolationException) as exc:
        contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 6000, "GHS", "contrib2")
    assert exc.value.decision.code == DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS
    
def test_contribution_exceeds_target(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 20000, "GHS", "init3")
    db_session.commit()
    db_session.refresh(test_account)
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 5000, "GHS", "contrib3a")
    db_session.commit()
    db_session.refresh(goal)
    db_session.refresh(test_account)
    
    available_before = test_account.available_balance
    locked_before = test_account.locked_balance
    goal_locked_before = goal.locked_amount
    goal_current_before = goal.current_amount
    
    with pytest.raises(ConstraintViolationException) as exc:
        contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 6000, "GHS", "contrib3b")
    assert exc.value.decision.code == DecisionCode.CONTRIBUTION_EXCEEDS_REMAINING_TARGET
    
    db_session.refresh(goal)
    db_session.refresh(test_account)
    
    assert test_account.available_balance == available_before
    assert test_account.locked_balance == locked_before
    assert goal.locked_amount == goal_locked_before
    assert goal.current_amount == goal_current_before
    
def test_exact_target_achievement(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "init4")
    db_session.commit()
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 10000, "GHS", "contrib4")
    db_session.commit()
    
    db_session.refresh(goal)
    assert goal.status == "ACHIEVED"
    assert goal.current_amount == 10000
    assert goal.locked_amount == 10000

def test_idempotent_goal_contribution(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 20000, "GHS", "init5")
    db_session.commit()
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    
    tx1 = contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 5000, "GHS", "idem1")
    db_session.commit()
    
    tx2 = contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 5000, "GHS", "idem1")
    db_session.commit()
    
    assert tx1.id == tx2.id
    db_session.refresh(goal)
    assert goal.current_amount == 5000 # Second request didn't duplicate the effect

def test_goal_ownership_protection(db_session: Session, test_user, test_user_2, test_account_2):
    goal = create_goal(db_session, test_user.id, "User 1 Goal", 10000)
    process_income(db_session, test_user_2.id, test_account_2.id, 20000, "GHS", "init6")
    db_session.commit()
    
    with pytest.raises(ConstraintViolationException) as exc:
        contribute_to_goal(db_session, test_user_2.id, test_account_2.id, goal.id, 5000, "GHS", "contrib6")
    assert exc.value.decision.code == DecisionCode.GOAL_NOT_OWNED
def test_concurrency_overfunding_prevention():
    from tests.conftest import engine, TestingSessionLocal
    import threading
    
    # Setup state via a normal session
    setup_session = TestingSessionLocal()
    from app.models.user import User
    from app.models.account import Account
    import uuid
    from app.services.transaction_service import process_income
    
    uid = uuid.uuid4()
    user = User(email=f"conc_{uid}@example.com", name="Conc User", password_hash="hashed")
    setup_session.add(user)
    setup_session.commit()
    
    account = Account(user_id=user.id, name="Conc Main", type="MAIN", currency="GHS")
    setup_session.add(account)
    setup_session.commit()
    
    # Fund with 2000
    process_income(setup_session, user.id, account.id, 2000, "GHS", f"init_conc_{uid}")
    setup_session.commit()
    
    # Create goal
    goal = create_goal(setup_session, user.id, "Conc Goal", 10000)
    
    user_id = user.id
    account_id = account.id
    goal_id = goal.id
    setup_session.close()
    
    # Execute 2 concurrent requests trying to contribute 1500 each (total 3000, > 2000 available)
    # The first one should succeed, the second one should block on SELECT FOR UPDATE and then fail INSUFFICIENT_AVAILABLE_FUNDS
    
    results = []
    
    def worker():
        session = TestingSessionLocal()
        try:
            contribute_to_goal(session, user_id, account_id, goal_id, 1500, "GHS", str(uuid.uuid4()))
            session.commit()
            results.append("SUCCESS")
        except ConstraintViolationException as e:
            session.rollback()
            results.append(e.decision.code.name)
        except Exception as e:
            session.rollback()
            results.append("ERROR")
        finally:
            session.close()
            
    t1 = threading.Thread(target=worker)
    t2 = threading.Thread(target=worker)
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    # Check results
    assert "SUCCESS" in results
    assert "FUNDS_LOCKED" in results
    
    verify_session = TestingSessionLocal()
    account_after = verify_session.get(Account, account_id)
    goal_after = verify_session.get(Goal, goal_id)
    
    assert account_after.available_balance == 500
    assert account_after.locked_balance == 1500
    assert goal_after.current_amount == 1500
    assert goal_after.locked_amount == 1500
    verify_session.close()
import pytest
import uuid
import threading
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.ledger_entry import LedgerEntry
from app.rules.decision import ConstraintViolationException
from app.rules.codes import DecisionCode
from app.services.goal_service import create_goal, contribute_to_goal
from app.services.transaction_service import process_income

def test_goal_edit_target_amount(db_session: Session, test_user):
    from app.services.goal_service import create_goal, edit_goal
    import pytest
    import uuid
    goal = create_goal(
        db=db_session,
        user_id=test_user.id,
        name="Edit Test Goal",
        target_amount=450000,
        currency="GHS",
        lock_type="TARGET_REACHED"
    )
    db_session.commit()
    assert goal.target_amount == 450000

    # Try passing target_amount in python to simulate bypassing API
    with pytest.raises(TypeError):
        edit_goal(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=300000
        )

def test_goal_edit_target_amount_with_funding(db_session: Session, test_user, test_account):
    from app.services.transaction_service import process_income
    from app.services.goal_service import create_goal, edit_goal, contribute_to_goal
    import pytest
    process_income(db_session, test_user.id, test_account.id, 500000, "GHS", "init")
    db_session.commit()
    
    goal = create_goal(db=db_session, user_id=test_user.id, name="Funded Edit Goal", target_amount=450000, currency="GHS", lock_type="TARGET_REACHED")
    db_session.commit()

    contribute_to_goal(db=db_session, user_id=test_user.id, account_id=test_account.id, goal_id=goal.id, amount_pesewas=400000)
    db_session.commit()

    with pytest.raises(TypeError):
        edit_goal(db=db_session, user_id=test_user.id, goal_id=goal.id, target_amount=600000)

def test_full_goal_lifecycle(db_session: Session, test_user, test_account):
    from app.services.goal_service import create_goal, edit_goal, contribute_to_goal
    from app.services.transaction_service import process_income
    from app.models.goal import Goal
    
    process_income(db_session, test_user.id, test_account.id, 1000000, "GHS", "init_lifecycle")
    db_session.commit()
    
    goal = create_goal(db=db_session, user_id=test_user.id, name="Lifecycle Goal", target_amount=450000, currency="GHS", lock_type="TARGET_REACHED")
    db_session.commit()
    
    goal = edit_goal(db_session, test_user.id, goal.id, name="Renamed")
    db_session.commit()
    
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 450000)
    db_session.commit()
    
    db_session.refresh(goal)
    assert goal.status == "ACHIEVED"

import pytest
import uuid
from sqlalchemy.orm import Session
from app.services.goal_service import create_goal, contribute_to_goal, delete_goal
from app.services.transaction_service import process_income

def test_goal_with_zero_contribution_can_be_deleted(db_session: Session, test_user):
    goal = create_goal(db_session, test_user.id, 'Delete Me', 50000)
    delete_goal(db_session, test_user.id, goal.id)
    # verify
    from app.models.goal import Goal
    assert db_session.query(Goal).filter_by(id=goal.id).first() is None

def test_goal_with_contribution_cannot_be_deleted(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "init_del")
    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, 'Do Not Delete', 50000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 1000, "GHS", "contrib")
    
    with pytest.raises(ValueError, match="This goal cannot be deleted because it contains locked funds"):
        delete_goal(db_session, test_user.id, goal.id)
