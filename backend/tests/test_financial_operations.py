from tests.conftest import engine
import pytest
import uuid
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.account import Account
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.provider_attempt import ProviderAttempt
from app.services.outbox_worker import process_outbox_events
from app.models.ledger_entry import LedgerEntry
from app.models.user import User
from app.providers.sandbox import SandboxProvider
from app.rules.decision import ConstraintViolationException
from app.services.financial_operations import (
    initiate_fund,
    initiate_send,
    initiate_pay,
    initiate_withdraw,
)
from app.services.transaction_service import process_income

# Use existing conftest fixtures: db_session


def test_sandbox_provider_modes():
    """Verify the SandboxProvider behaves deterministically according to its mode."""
    # 1. Success mode
    provider = SandboxProvider(mode="success")
    res = provider.fund(idempotency_key="k1", amount_pesewas=100, currency="GHS", source_address="123", source_type="MOBILE_MONEY")
    assert res.status == "SUCCEEDED"
    assert res.provider_reference == "SANDBOX-FUND-k1"
    
    # 2. Failure mode
    provider_fail = SandboxProvider(mode="failure")
    res_fail = provider_fail.send(idempotency_key="k2", amount_pesewas=100, currency="GHS", destination_address="123", destination_type="MOBILE_MONEY")
    assert res_fail.status == "FAILED"
    assert res_fail.error_code == "SANDBOX_SIMULATED_FAILURE"
    assert res_fail.provider_reference is None
    
    # 3. Timeout mode
    provider_timeout = SandboxProvider(mode="timeout")
    res_timeout = provider_timeout.pay(idempotency_key="k3", amount_pesewas=100, currency="GHS", merchant_code="M1", service_type="TV")
    assert res_timeout.status == "IN_DOUBT"

    # 4. Pending mode
    provider_pending = SandboxProvider(mode="pending")
    res_pending = provider_pending.withdraw(idempotency_key="k4", amount_pesewas=100, currency="GHS", destination_address="B1", destination_type="BANK")
    assert res_pending.status == "PENDING"
    assert res_pending.provider_reference == "SANDBOX-WITHDRAW-k4"


def test_fund_success_lifecycle(db_session: Session, test_user, test_account):
    """
    FUND: PENDING -> PROCESSING -> COMPLETED.
    No funds are posted until COMPLETED.
    """
    idem = f"fund_{uuid.uuid4()}"
    tx = initiate_fund(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        amount_pesewas=50000,
        source_address="0551234567",
        idempotency_key=idem,
        provider=SandboxProvider(mode="success")
    )
    process_outbox_events(db_session)
    if 'tx' in locals(): db_session.refresh(tx)
    db_session.refresh(test_account)
    
    assert tx.status == TransactionStatus.COMPLETED.value
    assert test_account.available_balance == 50000
    
    # Check ProviderAttempt
    pr = db_session.query(ProviderAttempt).filter_by(transaction_id=tx.id).first()
    assert pr.status == "SUCCEEDED"
    assert pr.provider_reference == f"SANDBOX-FUND-{tx.id}_1"
    
    # Check Ledger
    entries = db_session.query(LedgerEntry).filter_by(transaction_id=tx.id).all()
    assert len(entries) == 2
    assert sum(e.amount for e in entries if e.entry_type == "CREDIT") == 50000
    avail_credit = next(e for e in entries if e.balance_type == "AVAILABLE")
    assert avail_credit.entry_type == "CREDIT"


def test_send_success_lifecycle_with_fees(db_session: Session, test_user, test_account):
    """
    SEND: PENDING -> PROCESSING (reserved) -> COMPLETED (released, sent).
    Verifies fee handling and reserved balance mutations.
    """
    # Pre-fund
    process_income(db_session, test_user.id, test_account.id, 100000, "GHS", "init", "Init")
    db_session.commit()
    
    idem = f"send_{uuid.uuid4()}"
    tx = initiate_send(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        amount_pesewas=20000,
        fee_pesewas=1000,
        destination_address="0559876543",
        idempotency_key=idem,
        provider=SandboxProvider(mode="success")
    )
    process_outbox_events(db_session)
    if 'tx' in locals(): db_session.refresh(tx)
    db_session.refresh(test_account)
    
    assert tx.status == TransactionStatus.COMPLETED.value
    assert tx.fee_amount == 1000
    # Available went from 100k -> 79k (20k + 1k fee)
    assert test_account.available_balance == 79000
    # Reserved went up then down, should be 0
    assert test_account.reserved_balance == 0
    
    # Verify FEE transaction was created
    fee_tx = db_session.query(Transaction).filter_by(fee_for_transaction_id=tx.id).first()
    assert fee_tx is not None
    assert fee_tx.type == TransactionType.FEE.value
    assert fee_tx.amount == 1000
    
    # Verify Ledger
    entries = db_session.query(LedgerEntry).filter_by(transaction_id=tx.id).all()
    assert len(entries) == 4 # 2 for reserve, 2 for complete
    # The final completion posts RESERVED DEBIT and EXTERNAL CREDIT
    ext_credit = next(e for e in entries if e.balance_type == "EXTERNAL" and e.entry_type == "CREDIT")
    assert ext_credit.amount == 21000 # 20k + 1k


def test_pay_failure_lifecycle(db_session: Session, test_user, test_account):
    """
    PAY: PENDING -> PROCESSING (reserved) -> FAILED (released back to available).
    """
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "init2", "Init")
    db_session.commit()
    
    idem = f"pay_{uuid.uuid4()}"
    tx = initiate_pay(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        amount_pesewas=10000,
        merchant_code="ECG123",
        service_type="ELECTRICITY",
        idempotency_key=idem,
        provider=SandboxProvider(mode="failure") # Forced failure
    )
    from app.services.money_movement_hub import MoneyMovementHub
    from app.providers.router import ProviderRouter
    from app.models.money_rail import MoneyRail
    r = ProviderRouter()
    r.register(MoneyRail.SANDBOX, SandboxProvider(mode="failure"))
    h = MoneyMovementHub(router=r)
    process_outbox_events(db_session, hub=h)
    if 'tx' in locals(): db_session.refresh(tx)
    db_session.refresh(test_account)
    
    assert tx.status == TransactionStatus.FAILED.value
    assert tx.failure_reason == "Sandbox simulated provider failure."
    
    # Balance must be fully restored
    assert test_account.available_balance == 50000
    assert test_account.reserved_balance == 0
    
    # ProviderAttempt must reflect failure
    pr = db_session.query(ProviderAttempt).filter_by(transaction_id=tx.id).first()
    assert pr.status == "FAILED"
    assert pr.error_code == "SANDBOX_SIMULATED_FAILURE"
    
    # Ledger must have reversing entries (AVAILABLE DEBIT -> RESERVED CREDIT, then RESERVED DEBIT -> AVAILABLE CREDIT)
    entries = db_session.query(LedgerEntry).filter_by(transaction_id=tx.id).all()
    assert len(entries) == 4
    avail_credits = sum(e.amount for e in entries if e.balance_type == "AVAILABLE" and e.entry_type == "CREDIT")
    avail_debits = sum(e.amount for e in entries if e.balance_type == "AVAILABLE" and e.entry_type == "DEBIT")
    assert avail_credits == avail_debits == 10000


def test_withdraw_insufficient_funds(db_session: Session, test_user, test_account):
    """
    WITHDRAW: Should fail at Rules Engine layer before PENDING is even created.
    """
    process_income(db_session, test_user.id, test_account.id, 10000, "GHS", "init3", "Init")
    db_session.commit()
    
    with pytest.raises(ConstraintViolationException) as exc:
        initiate_withdraw(
            db=db_session,
            user_id=test_user.id,
            account_id=test_account.id,
            amount_pesewas=15000, # More than 10k
            destination_address="BANK123",
            provider=SandboxProvider(mode="success")
        )
    assert "Insufficient funds" in exc.value.decision.message
    
    # No transaction should be created
    assert db_session.query(Transaction).filter_by(account_id=test_account.id, type="WITHDRAW").count() == 0


def test_idempotency_returns_existing_transaction(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 100000, "GHS", "init4", "Init")
    db_session.commit()
    
    idem = "idem_send_1"
    
    # First call
    tx1 = initiate_send(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        amount_pesewas=5000,
        destination_address="055",
        idempotency_key=idem,
        provider=SandboxProvider(mode="success")
    )
    db_session.commit()
    
    # Second call
    tx2 = initiate_send(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        amount_pesewas=5000,
        destination_address="055",
        idempotency_key=idem,
        provider=SandboxProvider(mode="success")
    )
    
    assert tx1.id == tx2.id
    process_outbox_events(db_session)
    if 'tx' in locals(): db_session.refresh(tx)
    db_session.refresh(test_account)
    assert test_account.available_balance == 95000 # Only deducted once

def test_idempotency_strict_rejection(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 100000, "GHS", "init5", "Init")
    db_session.commit()
    
    idem = "idem_strict_1"
    
    # First call
    tx1 = initiate_send(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        amount_pesewas=5000,
        destination_address="055",
        idempotency_key=idem,
        provider=SandboxProvider(mode="success")
    )
    db_session.commit()
    
    # Second call with DIFFERENT amount, same key -> should be rejected
    with pytest.raises(ConstraintViolationException) as exc:
        initiate_send(
            db=db_session,
            user_id=test_user.id,
            account_id=test_account.id,
            amount_pesewas=8000, # different
            destination_address="055",
            idempotency_key=idem,
            provider=SandboxProvider(mode="success")
        )
    assert "Idempotency key reused with different parameters" in exc.value.decision.message


@pytest.mark.skipif(engine.dialect.name == "sqlite", reason="Concurrency tests require PostgreSQL")
def test_concurrency_protection():
    """
    Test that two concurrent spends against the same account cannot both succeed
    if the combined amount exceeds the available balance.
    Available: 10000. Ops A and B both try to spend 7000.
    """
    import threading
    import uuid
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.models.account import Account
    from app.services.transaction_service import process_income
    from app.rules.codes import DecisionCode
    
    # 1. Set up data using a REAL connection that commits
    u_id = uuid.uuid4()
    a_id = uuid.uuid4()
    
    with SessionLocal() as db:
        user = User(id=u_id, email=f"conc_{u_id}@example.com", first_name="Test", last_name="Conc User", phone_number=f"+233{uuid.uuid4().int % 1000000000:09d}", password_hash="hash", currency="GHS")
        account = Account(id=a_id, user_id=u_id, name="Conc Account", type="MAIN", currency="GHS", available_balance=0, reserved_balance=0, locked_balance=0)
        db.add(user)
        db.add(account)
        db.commit()
        
        process_income(db, u_id, a_id, 10000, "GHS", f"init_conc_{u_id}", "Init")
        db.commit()
    
    errors = []
    successes = []
    
    def run_op(name, amount):
        with SessionLocal() as local_session:
            try:
                tx = initiate_send(
                    db=local_session,
                    user_id=u_id,
                    account_id=a_id,
                    amount_pesewas=amount,
                    destination_address=f"dest_{name}",
                    idempotency_key=f"idem_conc_{name}_{u_id}",
                    provider=SandboxProvider(mode="success")
                )
                process_outbox_events(local_session)
                local_session.commit()
                successes.append(tx.id)
            except Exception as e:
                local_session.rollback()
                errors.append(e)

    t1 = threading.Thread(target=run_op, args=("A", 7000))
    t2 = threading.Thread(target=run_op, args=("B", 7000))
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    # Only one should succeed
    if len(successes) != 1:
        print("ERRORS:", errors)
        assert len(successes) == 1
    assert len(errors) == 1
    
    assert isinstance(errors[0], ConstraintViolationException)
    assert errors[0].decision.code in (DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS, DecisionCode.FUNDS_LOCKED)
    
    # Verify final balance: 10000 - 7000 = 3000
    with SessionLocal() as db:
        final_account = db.query(Account).get(a_id)
        assert final_account.available_balance == 3000
