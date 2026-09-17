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
    
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    
    with pytest.raises(ConstraintViolationException) as exc:
        contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 15000, "GHS", "contrib3")
    assert exc.value.decision.code == DecisionCode.CONTRIBUTION_EXCEEDS_REMAINING_TARGET
    
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
from app.services.goal_service import create_goal, contribute_to_goal, release_goal
from app.services.transaction_service import process_income

def test_release_exact_completion(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "init_rel_1")
    db_session.commit()
    db_session.refresh(test_account)
    
    total_before = test_account.total_balance
    assert total_before == 10000
    
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 10000, "GHS", "contrib_rel_1")
    db_session.commit()
    db_session.refresh(goal)
    db_session.refresh(test_account)
    
    assert goal.status == "ACHIEVED"
    assert goal.locked_amount == 10000
    assert test_account.locked_balance == 10000
    assert test_account.available_balance == 0
    assert test_account.total_balance == total_before
    
    # Now release
    tx = release_goal(db_session, test_user.id, test_account.id, goal.id, "rel_1")
    db_session.commit()
    db_session.refresh(goal)
    db_session.refresh(test_account)
    
    assert goal.status == "RELEASED"
    assert goal.locked_amount == 0
    assert goal.current_amount == 10000 # historical
    assert test_account.locked_balance == 0
    assert test_account.available_balance == 10000
    assert test_account.total_balance == total_before
    
    # Ledger test
    ledger = db_session.query(LedgerEntry).filter_by(transaction_id=tx.id).first()
    assert ledger is not None
    assert ledger.entry_type == "RELEASE"
    
def test_release_active_goal_fails(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "init_rel_2")
    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 5000, "GHS", "contrib_rel_2")
    db_session.commit()
    db_session.refresh(goal)
    assert goal.status == "ACTIVE"
    
    with pytest.raises(ConstraintViolationException) as exc:
        release_goal(db_session, test_user.id, test_account.id, goal.id, "rel_2")
    assert exc.value.decision.code == DecisionCode.GOAL_NOT_ACHIEVED
    
def test_release_already_released_goal_fails(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "init_rel_3")
    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 10000, "GHS", "contrib_rel_3")
    db_session.commit()
    
    release_goal(db_session, test_user.id, test_account.id, goal.id, "rel_3")
    db_session.commit()
    
    # Same key -> idempotency prevents error, just returns
    tx_idem = release_goal(db_session, test_user.id, test_account.id, goal.id, "rel_3")
    assert tx_idem is not None
    
    # Different key -> state transition failure
    with pytest.raises(ConstraintViolationException) as exc:
        release_goal(db_session, test_user.id, test_account.id, goal.id, "rel_3_diff")
    assert exc.value.decision.code == DecisionCode.GOAL_ALREADY_RELEASED
    
def test_multi_goal_release_isolation(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "init_rel_4")
    db_session.commit()
    
    goal_a = create_goal(db_session, test_user.id, "Goal A", 3000)
    goal_b = create_goal(db_session, test_user.id, "Goal B", 2000)
    
    contribute_to_goal(db_session, test_user.id, test_account.id, goal_a.id, 3000, "GHS", "contrib_rel_4_a")
    contribute_to_goal(db_session, test_user.id, test_account.id, goal_b.id, 2000, "GHS", "contrib_rel_4_b")
    db_session.commit()
    
    db_session.refresh(test_account)
    assert test_account.locked_balance == 5000
    assert test_account.available_balance == 5000
    
    release_goal(db_session, test_user.id, test_account.id, goal_a.id, "rel_4")
    db_session.commit()
    
    db_session.refresh(test_account)
    db_session.refresh(goal_a)
    db_session.refresh(goal_b)
    
    assert test_account.locked_balance == 2000
    assert test_account.available_balance == 8000
    assert goal_a.locked_amount == 0
    assert goal_a.status == "RELEASED"
    assert goal_b.locked_amount == 2000
    assert goal_b.status == "ACHIEVED"

def test_release_ownership_isolation(db_session: Session, test_user, test_account, test_user_2, test_account_2):
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "init_rel_5")
    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, "MacBook", 10000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 10000, "GHS", "contrib_rel_5")
    db_session.commit()
    
    with pytest.raises(ConstraintViolationException) as exc:
        release_goal(db_session, test_user_2.id, test_account_2.id, goal.id, "rel_5")
    assert exc.value.decision.code == DecisionCode.GOAL_NOT_OWNED

def test_release_reserved_funds_isolation(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "init_rel_6")
    db_session.commit()
    
    # Fake reserve 2000
    test_account.reserved_balance = 2000
    test_account.available_balance -= 2000
    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, "MacBook", 5000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 5000, "GHS", "contrib_rel_6")
    db_session.commit()
    
    db_session.refresh(test_account)
    assert test_account.available_balance == 3000
    assert test_account.locked_balance == 5000
    assert test_account.reserved_balance == 2000
    
    release_goal(db_session, test_user.id, test_account.id, goal.id, "rel_6")
    db_session.commit()
    
    db_session.refresh(test_account)
    assert test_account.available_balance == 8000
    assert test_account.locked_balance == 0
    assert test_account.reserved_balance == 2000
    assert test_account.total_balance == 10000

def test_release_concurrency():
    from tests.conftest import engine, TestingSessionLocal
    import os
    if os.environ.get("DB_DIALECT") == "sqlite":
        pytest.skip("Concurrency test skipped on SQLite")
        
    setup_session = TestingSessionLocal()
    uid = uuid.uuid4()
    user = User(email=f"conc_rel_{uid}@example.com", name="Conc User", password_hash="hashed")
    setup_session.add(user)
    setup_session.commit()
    
    account = Account(user_id=user.id, name="Conc Main", type="MAIN", currency="GHS")
    setup_session.add(account)
    setup_session.commit()
    
    process_income(setup_session, user.id, account.id, 5000, "GHS", f"init_conc_rel_{uid}")
    setup_session.commit()
    
    goal = create_goal(setup_session, user.id, "Conc Goal", 5000)
    contribute_to_goal(setup_session, user.id, account.id, goal.id, 5000, "GHS", f"contrib_conc_rel_{uid}")
    setup_session.commit()
    
    user_id = user.id
    account_id = account.id
    goal_id = goal.id
    setup_session.close()
    
    results = []
    
    def worker():
        session = TestingSessionLocal()
        try:
            # Different keys to bypass idempotency and hit the DB lock
            release_goal(session, user_id, account_id, goal_id, str(uuid.uuid4()))
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
    
    assert "SUCCESS" in results
    assert "GOAL_ALREADY_RELEASED" in results
    
    verify_session = TestingSessionLocal()
    account_after = verify_session.get(Account, account_id)
    goal_after = verify_session.get(Goal, goal_id)
    
    assert account_after.available_balance == 5000
    assert account_after.locked_balance == 0
    assert goal_after.status == "RELEASED"
    assert goal_after.locked_amount == 0
    verify_session.close()
