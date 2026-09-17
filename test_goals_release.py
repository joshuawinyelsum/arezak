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
    assert ledger.entry_type == "TRANSFER_IN"
    
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
