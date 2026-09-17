import pytest
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
import threading

from app.models.account import Account
from app.models.ledger_entry import LedgerEntry
from app.models.user import User
from app.rules import ConstraintViolationException, DecisionCode
from app.services.transaction_service import process_income, process_expense

def create_test_user(db: Session):
    user = User(email=f"test_{uuid.uuid4()}@example.com", name="Test User", password_hash="hashed")
    db.add(user)
    db.commit()
    return user

def create_test_account(db: Session, user_id: uuid.UUID):
    account = Account(user_id=user_id, name="Main", type="MAIN", currency="GHS")
    db.add(account)
    db.commit()
    return account

def test_money_representation(db_session: Session):
    # Verify GH₵10,000.00 -> 1,000,000 pesewas
    user = create_test_user(db_session)
    account = create_test_account(db_session, user.id)
    
    tx = process_income(db_session, user.id, account.id, 1000000, "GHS", "idem1", "Salary")
    db_session.commit()
    
    assert tx.amount == 1000000
    assert tx.currency == "GHS"
    assert type(tx.amount) is int

def test_income_increases_balance_and_creates_ledger(db_session: Session):
    user = create_test_user(db_session)
    account = create_test_account(db_session, user.id)
    
    tx = process_income(db_session, user.id, account.id, 50000, "GHS", "idem2", "Deposit")
    db_session.commit()
    
    db_session.refresh(account)
    assert account.available_balance == 50000
    
    assert len(account.ledger_entries) == 1
    assert account.ledger_entries[0].entry_type == "CREDIT"
    assert account.ledger_entries[0].amount == 50000
    assert account.ledger_entries[0].currency == "GHS"

def test_idempotency_prevents_duplicates(db_session: Session):
    user = create_test_user(db_session)
    account = create_test_account(db_session, user.id)
    
    tx1 = process_income(db_session, user.id, account.id, 20000, "GHS", "idem3", "Deposit")
    db_session.commit()
    
    tx2 = process_income(db_session, user.id, account.id, 20000, "GHS", "idem3", "Deposit")
    db_session.commit()
    
    assert tx1.id == tx2.id
    db_session.refresh(account)
    assert account.available_balance == 20000

def test_ownership_enforcement(db_session: Session):
    user1 = create_test_user(db_session)
    user2 = create_test_user(db_session)
    account1 = create_test_account(db_session, user1.id)
    
    with pytest.raises(ConstraintViolationException) as exc:
        process_income(db_session, user2.id, account1.id, 10000, "GHS", "idem4", "Steal")
    assert exc.value.decision.code == DecisionCode.ACCOUNT_NOT_FOUND

def test_multiple_transactions_atomicity(db_session: Session):
    user = create_test_user(db_session)
    account = create_test_account(db_session, user.id)
    
    process_income(db_session, user.id, account.id, 10000, "GHS", "idem5", "Dep1")
    process_income(db_session, user.id, account.id, 20000, "GHS", "idem6", "Dep2")
    process_expense(db_session, user.id, account.id, 5000, "GHS", "idem7", "Exp1")
    db_session.commit()
    
    db_session.refresh(account)
    assert account.available_balance == 25000
    assert len(account.ledger_entries) == 3


def test_concurrency():
    from tests.conftest import engine, TestingSessionLocal
    import threading
    import uuid
    from app.models.user import User
    from app.models.account import Account
    from app.services.transaction_service import process_income, process_expense
    from app.rules.decision import ConstraintViolationException
    import os
    if os.environ.get("DB_DIALECT") == "sqlite":
        pytest.skip("Concurrency test skipped on SQLite")
        
    setup_session = TestingSessionLocal()
    uid = uuid.uuid4()
    user = User(email=f"conc_{uid}@example.com", name="Conc User", password_hash="hashed")
    setup_session.add(user)
    setup_session.commit()
    
    account = Account(user_id=user.id, name="Conc Main", type="MAIN", currency="GHS")
    setup_session.add(account)
    setup_session.commit()
    
    process_income(setup_session, user.id, account.id, 2000, "GHS", f"init_conc_{uid}")
    setup_session.commit()
    
    user_id = user.id
    account_id = account.id
    setup_session.close()
    
    results = []
    
    def worker():
        session = TestingSessionLocal()
        try:
            process_expense(session, user_id, account_id, 1500, "GHS", str(uuid.uuid4()))
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
    assert "INSUFFICIENT_AVAILABLE_FUNDS" in results
    
    verify_session = TestingSessionLocal()
    account_after = verify_session.get(Account, account_id)
    assert account_after.available_balance == 500
    verify_session.close()
