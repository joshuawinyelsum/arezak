import pytest
import uuid
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.provider_attempt import ProviderAttempt
from app.models.outbox_event import OutboxEvent, OutboxStatus
from app.models.webhook_event import WebhookEvent
from app.models.ledger_entry import LedgerEntry
from app.models.money_rail import MoneyRail
from app.providers.sandbox import SandboxProvider
from app.providers.router import ProviderRouter
from app.providers.base import ProviderRoutingError
from app.services.money_movement_hub import MoneyMovementHub
from app.services.financial_operations import initiate_send
from app.services.outbox_worker import process_outbox_events
from app.services.transaction_service import process_income
from app.providers.base import ProviderEventType
from app.services.reconciliation import (
    reconcile_transaction,
    record_unmatched_provider_operation,
    reconcile_due_transactions,
)

@pytest.fixture
def custom_hub():
    router = ProviderRouter()
    # We will register specific modes per test via the router
    return MoneyMovementHub(router=router)


def test_provider_router_rejects_disabled_and_unsupported_rail():
    router = ProviderRouter()
    provider = SandboxProvider()
    router.register(MoneyRail.SANDBOX, provider)
    router.set_provider_enabled("SANDBOX", False)
    with pytest.raises(ProviderRoutingError):
        router.resolve("SEND", MoneyRail.SANDBOX)
    router.set_provider_enabled("SANDBOX", True)
    with pytest.raises(ProviderRoutingError):
        router.resolve("SEND", MoneyRail.MTN_MOMO)

def test_hub_timeout_in_doubt_no_ledger(db_session: Session, test_user, test_account, custom_hub):
    """Provider timeout -> IN_DOUBT (funds remain reserved)"""
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "init_hub", "Init")
    db_session.commit()
    
    custom_hub.router.register(MoneyRail.SANDBOX, SandboxProvider(mode="timeout"))
    
    tx = initiate_send(
        db=db_session, user_id=test_user.id, account_id=test_account.id,
        amount_pesewas=10000, destination_address="1234",
    )
    process_outbox_events(db_session, hub=custom_hub)
    db_session.refresh(tx)
    db_session.refresh(test_account)
    
    assert tx.status == TransactionStatus.IN_DOUBT.value
    # 50000 - 10000 reserved = 40000 available, 10000 reserved
    assert test_account.available_balance == 40000
    assert test_account.reserved_balance == 10000
    
    attempt = db_session.query(ProviderAttempt).filter_by(transaction_id=tx.id).first()
    assert attempt.status == "IN_DOUBT"
    
def test_hub_webhook_duplicate(db_session: Session, test_user, test_account, custom_hub):
    """Duplicate webhook -> no second financial effect"""
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "init_hub2", "Init")
    db_session.commit()
    
    provider = SandboxProvider(mode="delayed_success")
    custom_hub.router.register(MoneyRail.SANDBOX, provider)
    
    tx = initiate_send(
        db=db_session, user_id=test_user.id, account_id=test_account.id,
        amount_pesewas=10000, destination_address="1234",
    )
    process_outbox_events(db_session, hub=custom_hub)
    db_session.refresh(tx)
    
    assert tx.status == TransactionStatus.IN_DOUBT.value
    attempt = db_session.query(ProviderAttempt).filter_by(transaction_id=tx.id).one()
    assert attempt.provider_reference == tx.provider_reference
    assert attempt.provider_reference is not None
    db_session.refresh(test_account)
    assert test_account.available_balance == 40000
    assert test_account.reserved_balance == 10000
    
    # The signed webhook resolves the uncertain outcome; duplicate delivery is inert.
    payload, headers = provider.build_webhook_payload(
        event_type=ProviderEventType.TRANSACTION_SUCCEEDED,
        provider_reference=tx.provider_reference,
        amount_pesewas=10000,
        event_id=f"evt_{uuid.uuid4()}",
    )
    we1 = custom_hub.ingest_webhook(db_session, "SANDBOX", payload, headers)
    assert we1.processing_status == "PROCESSED"
    assert we1.resolved_transaction_id == str(tx.id), we1.error_message
    db_session.refresh(tx)
    assert tx.status == TransactionStatus.COMPLETED.value
    db_session.refresh(test_account)
    assert test_account.reserved_balance == 0
    
    we2 = custom_hub.ingest_webhook(db_session, "SANDBOX", payload, headers)
    assert we2.id == we1.id
    assert we2.processing_status == "PROCESSED"

    db_session.refresh(test_account)
    assert test_account.available_balance == 40000 # No double charge


def test_in_doubt_status_inquiry_completes_once(db_session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "status_init", "Init")
    db_session.commit()
    router = ProviderRouter()
    provider = SandboxProvider(mode="delayed_success")
    router.register(MoneyRail.SANDBOX, provider)
    hub = MoneyMovementHub(router)
    tx = initiate_send(db_session, test_user.id, test_account.id, 10000,
                       destination_address="0551234567", provider=provider)
    process_outbox_events(db_session, hub=hub)
    db_session.refresh(tx)
    assert tx.status == TransactionStatus.IN_DOUBT.value
    hub.resolve_in_doubt(db_session, tx.id)
    db_session.refresh(tx)
    assert tx.status == TransactionStatus.COMPLETED.value
    before = db_session.query(LedgerEntry).filter_by(transaction_id=tx.id).count()
    db_session.refresh(test_account)
    assert test_account.reserved_balance == 0
    assert before == 4


def test_in_doubt_failed_status_releases_reservation(db_session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "failed_status_init", "Init")
    db_session.commit()
    router = ProviderRouter()
    provider = SandboxProvider(mode="delayed_failure")
    router.register(MoneyRail.SANDBOX, provider)
    hub = MoneyMovementHub(router)
    tx = initiate_send(db_session, test_user.id, test_account.id, 10000,
                       destination_address="0551234567", provider=provider)
    process_outbox_events(db_session, hub=hub)
    hub.resolve_in_doubt(db_session, tx.id)
    db_session.refresh(tx)
    db_session.refresh(test_account)
    assert tx.status == TransactionStatus.FAILED.value
    assert test_account.available_balance == 50000
    assert test_account.reserved_balance == 0


def test_out_of_order_webhook_does_not_reverse_completion(db_session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "order_init", "Init")
    db_session.commit()
    provider = SandboxProvider(mode="out_of_order_webhook")
    router = ProviderRouter()
    router.register(MoneyRail.SANDBOX, provider)
    hub = MoneyMovementHub(router)
    tx = initiate_send(db_session, test_user.id, test_account.id, 10000,
                       destination_address="0551234567", provider=provider)
    process_outbox_events(db_session, hub=hub)
    deliveries = provider.webhook_scenario(tx.provider_reference, 10000)
    hub.ingest_webhook(db_session, "SANDBOX", *deliveries[0])
    hub.ingest_webhook(db_session, "SANDBOX", *deliveries[1])
    db_session.refresh(tx)
    db_session.refresh(test_account)
    assert tx.status == TransactionStatus.COMPLETED.value
    assert test_account.available_balance == 40000
    assert test_account.reserved_balance == 0


def test_reconciliation_persists_discrepancy_evidence(db_session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "recon_init", "Init")
    db_session.commit()
    tx = initiate_send(db_session, test_user.id, test_account.id, 10000,
                       destination_address="0551234567")
    result = reconcile_transaction(db_session, tx.id, provider_status="COMPLETED",
                                   provider_reference="wrong-ref", provider_amount_pesewas=9000)
    assert result.status == "DISCREPANCY"
    assert result.discrepancy_code == "AMOUNT_MISMATCH"
    orphan = record_unmatched_provider_operation(
        db_session, "SANDBOX", "external-only", 500, "GHS", "COMPLETED"
    )
    assert orphan.discrepancy_code == "PROVIDER_WITHOUT_AREZAK_TRANSACTION"


def test_reconciliation_queries_and_resolves_in_doubt(db_session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "recon_resolve_init", "Init")
    db_session.commit()
    provider = SandboxProvider(mode="delayed_success")
    router = ProviderRouter()
    router.register(MoneyRail.SANDBOX, provider)
    hub = MoneyMovementHub(router)
    tx = initiate_send(db_session, test_user.id, test_account.id, 10000,
                       destination_address="0551234567", provider=provider)
    process_outbox_events(db_session, hub=hub)
    db_session.refresh(tx)
    assert tx.status == TransactionStatus.IN_DOUBT.value

    results = reconcile_due_transactions(db_session, hub)
    db_session.refresh(tx)
    assert len(results) == 1
    assert results[0].status == "MATCH"
    assert tx.status == TransactionStatus.COMPLETED.value
    db_session.refresh(test_account)
    assert test_account.reserved_balance == 0


def test_timeout_without_reference_recovers_by_original_idempotency_key(
    db_session, test_user, test_account
):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "timeout_key_init", "Init")
    db_session.commit()
    provider = SandboxProvider(mode="timeout")
    router = ProviderRouter()
    router.register(MoneyRail.SANDBOX, provider)
    hub = MoneyMovementHub(router)
    tx = initiate_send(db_session, test_user.id, test_account.id, 10000,
                       destination_address="0551234567", provider=provider)
    process_outbox_events(db_session, hub=hub)
    db_session.refresh(tx)
    assert tx.status == TransactionStatus.IN_DOUBT.value
    attempt = db_session.query(ProviderAttempt).filter_by(transaction_id=tx.id).one()
    assert attempt.provider_reference is None

    results = reconcile_due_transactions(db_session, hub)
    db_session.refresh(tx)
    db_session.refresh(attempt)
    assert results[0].status == "MATCH"
    assert tx.status == TransactionStatus.COMPLETED.value
    assert attempt.provider_reference is not None
    db_session.refresh(test_account)
    assert test_account.reserved_balance == 0


def test_worker_dispatch_exception_keeps_reservation_in_doubt(db_session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "worker_exception_init", "Init")
    db_session.commit()
    provider = SandboxProvider(mode="success")
    tx = initiate_send(db_session, test_user.id, test_account.id, 10000,
                       destination_address="0551234567", provider=provider)

    class CrashingHub:
        def dispatch_outbox_event(self, db, event):
            raise RuntimeError("sensitive provider detail must not be persisted")

    process_outbox_events(db_session, hub=CrashingHub())
    db_session.refresh(tx)
    db_session.refresh(test_account)
    attempt = db_session.query(ProviderAttempt).filter_by(transaction_id=tx.id).one()
    assert tx.status == TransactionStatus.IN_DOUBT.value
    assert attempt.status == "IN_DOUBT"
    assert test_account.reserved_balance == 10000
    assert test_account.available_balance == 40000
