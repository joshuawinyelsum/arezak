import pytest
from sqlalchemy.orm import Session
from app.services.transaction_service import process_income, process_outbound
from app.rules.decision import ConstraintViolationException
from app.models.account import Account
from app.models.user import User
from app.models.transaction import Transaction
from app.models.ledger_entry import LedgerEntry
import uuid
import threading
from tests.conftest import engine, TestingSessionLocal

@pytest.fixture
def test_user(db_session: Session):
    user = User(email=f"test_{uuid.uuid4()}@example.com", name="Test User", password_hash="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_account(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Main Account", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account


def test_outbound_reduces_available_balance(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 500000, "GHS", "init")
    db_session.commit()
    db_session.refresh(test_account)
    
    assert test_account.available_balance == 500000
    assert test_account.total_balance == 500000
    
    tx = process_outbound(db_session, test_user.id, test_account.id, 100000, "GHS", "SPEND", "Pay Merchant")
    db_session.commit()
    db_session.refresh(test_account)
    
    assert test_account.available_balance == 400000
    assert test_account.total_balance == 400000
    assert tx.type == "SPEND"

def test_outbound_insufficient_available_balance_rejected(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 100000, "GHS", "init2")
    db_session.commit()
    
    with pytest.raises(ConstraintViolationException):
        process_outbound(db_session, test_user.id, test_account.id, 200000, "GHS", "TRANSFER_OUT", "Send Money")

def test_outbound_invalid_amount(db_session: Session, test_user, test_account):
    with pytest.raises(ConstraintViolationException):
        process_outbound(db_session, test_user.id, test_account.id, -100, "GHS", "TRANSFER_OUT", "Send Money")

def test_outbound_duplicate_idempotency_key(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 500000, "GHS", "init3")
    db_session.commit()
    
    idem_key = str(uuid.uuid4())
    tx1 = process_outbound(db_session, test_user.id, test_account.id, 50000, "GHS", "SPEND", "Pay", idempotency_key=idem_key)
    db_session.commit()
    
    tx2 = process_outbound(db_session, test_user.id, test_account.id, 50000, "GHS", "SPEND", "Pay", idempotency_key=idem_key)
    db_session.commit()
    
    assert tx1.id == tx2.id
    db_session.refresh(test_account)
    assert test_account.available_balance == 450000 # Deducted only once!

def test_outbound_concurrent_requests():
    setup_session = TestingSessionLocal()
    uid = uuid.uuid4()
    user = User(email=f"conc_{uid}@example.com", name="Conc User", password_hash="hashed")
    setup_session.add(user)
    setup_session.commit()

    account = Account(user_id=user.id, name="Conc Main", type="MAIN", currency="GHS")
    setup_session.add(account)
    setup_session.commit()

    process_income(setup_session, user.id, account.id, 100000, "GHS", f"init_conc_{uid}")
    setup_session.commit()

    user_id = user.id
    account_id = account.id
    setup_session.close()

    results = []
    idem_key = str(uuid.uuid4())

    def worker():
        session = TestingSessionLocal()
        try:
            tx = process_outbound(session, user_id, account_id, 20000, "GHS", "WITHDRAW", "Cash Out", idempotency_key=idem_key)
            session.commit()
            results.append(tx.id)
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
    
    # Both should have succeeded and returned the EXACT same transaction ID due to idempotency + DB locks
    assert len(results) == 2
    assert results[0] == results[1]
    assert results[0] != "ERROR"
    
    check_session = TestingSessionLocal()
    acc = check_session.query(Account).filter_by(id=account_id).first()
    assert acc.available_balance == 80000 # Deducted only once
    check_session.close()

