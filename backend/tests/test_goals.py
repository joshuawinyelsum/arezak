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
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.goal import Goal
from app.services.goal_service import create_goal, contribute_to_goal, release_goal
from app.rules.decision import ConstraintViolationException
from app.rules.codes import DecisionCode
from tests.test_goals import process_income

def test_target_reached_unlock(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "t_init")
    db_session.commit()
    goal = create_goal(db_session, test_user.id, "Target Only", 10000, lock_type="TARGET_REACHED")
    db_session.commit()
    
    assert goal.is_eligible_for_release is False
    
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 10000, "GHS", "t_contrib")
    db_session.commit()
    db_session.refresh(goal)
    
    assert goal.status == "ACHIEVED"
    assert goal.is_eligible_for_release is True

def test_date_reached_unlock_before_date(db_session: Session, test_user, test_account):
    future_date = datetime.now(timezone.utc) + timedelta(days=7)
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "d_init")
    db_session.commit()
    goal = create_goal(db_session, test_user.id, "Date Only", 10000, lock_type="DATE_REACHED", unlock_date=future_date)
    db_session.commit()
    
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 10000, "GHS", "d_contrib")
    db_session.commit()
    db_session.refresh(goal)
    
    assert goal.status == "ACHIEVED"
    assert goal.is_eligible_for_release is False
    
    with pytest.raises(ConstraintViolationException) as exc:
        release_goal(db_session, test_user.id, test_account.id, goal.id, "d_release")
    assert exc.value.decision.code == DecisionCode.GOAL_NOT_ACHIEVED

def test_date_reached_unlock_after_date(db_session: Session, test_user, test_account):
    past_date = datetime.now(timezone.utc) - timedelta(days=1)
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "d_init2")
    db_session.commit()
    goal = create_goal(db_session, test_user.id, "Date Only", 10000, lock_type="DATE_REACHED", unlock_date=past_date)
    db_session.commit()
    
    # Even if target is NOT reached, date passed so it's eligible!
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 5000, "GHS", "d_contrib2")
    db_session.commit()
    db_session.refresh(goal)
    
    assert goal.status == "ACTIVE"
    assert goal.is_eligible_for_release is True

def test_target_and_date_unlock(db_session: Session, test_user, test_account):
    past_date = datetime.now(timezone.utc) - timedelta(days=1)
    future_date = datetime.now(timezone.utc) + timedelta(days=1)
    
    process_income(db_session, test_user.id, test_account.id, 40000, "GHS", "td_init")
    db_session.commit()
    
    # 1. Past date but target not reached
    goal1 = create_goal(db_session, test_user.id, "G1", 10000, lock_type="TARGET_AND_DATE", unlock_date=past_date)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal1.id, 5000, "GHS", "td_c1")
    db_session.commit()
    db_session.refresh(goal1)
    assert goal1.is_eligible_for_release is False
    
    # 2. Target reached but date not passed
    goal2 = create_goal(db_session, test_user.id, "G2", 10000, lock_type="TARGET_AND_DATE", unlock_date=future_date)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal2.id, 10000, "GHS", "td_c2")
    db_session.commit()
    db_session.refresh(goal2)
    assert goal2.is_eligible_for_release is False
    
    # 3. Target reached AND date passed
    goal3 = create_goal(db_session, test_user.id, "G3", 10000, lock_type="TARGET_AND_DATE", unlock_date=past_date)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal3.id, 10000, "GHS", "td_c3")
    db_session.commit()
    db_session.refresh(goal3)
    assert goal3.is_eligible_for_release is True

def test_goal_edit_target_amount(db_session: Session, test_user):
    from app.services.goal_service import create_goal, edit_goal
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

    # 4500 -> 3000
    goal = edit_goal(
        db=db_session,
        user_id=test_user.id,
        goal_id=goal.id,
        target_amount=300000
    )
    db_session.commit()
    assert goal.target_amount == 300000

    # 3000 -> 6000
    goal = edit_goal(
        db=db_session,
        user_id=test_user.id,
        goal_id=goal.id,
        target_amount=600000
    )
    db_session.commit()
    assert goal.target_amount == 600000

def test_goal_edit_target_amount_with_funding(db_session: Session, test_user, test_account):
    from app.services.goal_service import create_goal, edit_goal, contribute_to_goal
    import pytest
    goal = create_goal(
        db=db_session,
        user_id=test_user.id,
        name="Funded Edit Goal",
        target_amount=450000,
        currency="GHS",
        lock_type="TARGET_REACHED"
    )
    db_session.commit()
    
    # Add 4000
    contribute_to_goal(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        goal_id=goal.id,
        amount_pesewas=400000
    )
    db_session.commit()
    
    # 4500 -> 6000 (Allowed)
    goal = edit_goal(
        db=db_session,
        user_id=test_user.id,
        goal_id=goal.id,
        target_amount=600000
    )
    db_session.commit()
    assert goal.target_amount == 600000
    
    # 6000 -> 3000 (Fails, because current_amount is 4000)
    with pytest.raises(ValueError, match="Target amount cannot be lower than the currently locked amount"):
        edit_goal(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=300000
        )



def test_full_goal_lifecycle(db_session: Session, test_user, test_account):
    from app.services.goal_service import create_goal, edit_goal, contribute_to_goal, release_goal
    from app.services.transaction_service import process_income
    from app.models.goal import Goal
    
    # Setup income
    process_income(db_session, test_user.id, test_account.id, 1000000, "GHS", "init_lifecycle")
    db_session.commit()
    
    # 1. Create goal at 4500
    goal = create_goal(
        db=db_session,
        user_id=test_user.id,
        name="Lifecycle Goal",
        target_amount=450000,
        currency="GHS",
        lock_type="TARGET_REACHED"
    )
    db_session.commit()
    assert goal.target_amount == 450000
    assert goal.status == "ACTIVE"
    
    # 2. Edit 4500 -> 3000
    goal = edit_goal(db_session, test_user.id, goal.id, target_amount=300000)
    db_session.commit()
    assert goal.target_amount == 300000
    
    # 3. Edit 3000 -> 6000
    goal = edit_goal(db_session, test_user.id, goal.id, target_amount=600000)
    db_session.commit()
    assert goal.target_amount == 600000
    
    # 4. Reach target
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 600000)
    db_session.commit()
    db_session.refresh(goal)
    
    # 5. Verify goal becomes ACHIEVED
    assert goal.current_amount == 600000
    assert goal.status == "ACHIEVED"
    assert goal.target_reached == True
    assert goal.is_eligible_for_release == True
    
    # 6. Verify achieved goal remains retrievable
    retrieved = db_session.query(Goal).filter_by(id=goal.id).first()
    assert retrieved is not None
    assert retrieved.status == "ACHIEVED"
    
    # 7 & 8. Release funds
    release_goal(db_session, test_user.id, test_account.id, goal.id)
    db_session.commit()
    db_session.refresh(goal)
    assert goal.status == "RELEASED"


def test_immutable_target_amount(db_session: Session, test_user, test_account):
    from app.services.goal_service import create_goal, contribute_to_goal
    from app.api.v1.goals import api_edit_goal, GoalEditRequest
    
    # Setup
    process_income(db_session, test_user.id, test_account.id, 500000, "GHS", "init_immutable")
    db_session.commit()
    
    # 1. Create goal with target 10000
    goal = create_goal(
        db=db_session,
        user_id=test_user.id,
        name="Immutable Target Goal",
        target_amount=1000000,  # 10,000 GHS
        currency="GHS",
        lock_type="TARGET_REACHED"
    )
    db_session.commit()
    assert goal.target_amount == 1000000
    
    # 2. Edit goal name/icon -> succeeds
    req = GoalEditRequest(name="New Name", icon="NewIcon")
    updated_goal = api_edit_goal(goal.id, req, db_session, test_user)
    assert updated_goal.name == "New Name"
    assert updated_goal.icon == "NewIcon"
    assert updated_goal.target_amount == 1000000
    
    # 3. Attempt target 15000 (Current amount = 0)
    raw_json = {"target_amount": 1500000}
    req2 = GoalEditRequest.model_validate(raw_json)
    updated_goal2 = api_edit_goal(goal.id, req2, db_session, test_user)
    
    # Target remains 10000
    assert updated_goal2.target_amount == 1000000
    
    # 4. Attempt target 5000
    raw_json = {"target_amount": 500000}
    req3 = GoalEditRequest.model_validate(raw_json)
    updated_goal3 = api_edit_goal(goal.id, req3, db_session, test_user)
    
    # Target remains 10000
    assert updated_goal3.target_amount == 1000000
    
    # 5. Confirm true when current_amount > 0
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 200000, "GHS", "contrib_imm")
    db_session.commit()
    db_session.refresh(goal)
    assert goal.current_amount == 200000
    
    raw_json = {"target_amount": 300000}
    req4 = GoalEditRequest.model_validate(raw_json)
    updated_goal4 = api_edit_goal(goal.id, req4, db_session, test_user)
    
    # Target remains 10000
    assert updated_goal4.target_amount == 1000000
