import pytest
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone

from app.models.money_rail import MoneyRail, ProviderCapability
from app.providers.router import ProviderRegistration, ProviderRouter
from app.providers.sandbox import SandboxProvider
from app.providers.base import ProviderRoutingError, ProviderStatus, FailureClassification, classify_provider_result
from app.services.rail_resolver import RailResolutionError, RailResolver
from app.services.money_movement_hub import MoneyMovementHub
from app.providers.base import ProviderEventType
from app.providers.sandbox import _SANDBOX_WEBHOOK_SECRET
from app.services.financial_operations import initiate_send
from app.services.transaction_service import process_income
from app.rules.decision import ConstraintViolationException


@pytest.mark.parametrize("rail", [
    MoneyRail.MTN_MOMO,
    MoneyRail.TELECEL_CASH,
    MoneyRail.AIRTELTIGO_MONEY,
])
def test_explicit_mobile_rail_normalizes_ghana_phone(rail):
    result = RailResolver().resolve("055 123 4567", rail, destination_type="MOBILE_MONEY")
    assert result.rail == rail
    assert result.normalized_destination == "+233551234567"
    assert result.network_hint is None
    assert result.hint_is_authoritative is False


@pytest.mark.parametrize("number", [
    "0551234567",
    "+233551234567",
    "233551234567",
    "(055) 123-4567",
])
def test_phone_forms_normalize_to_ghana_e164(number):
    assert RailResolver().resolve(number, MoneyRail.MTN_MOMO).normalized_destination == "+233551234567"


@pytest.mark.parametrize("number", ["", "1234", "+23355123456", "+2330551234567", "055abc4567"])
def test_invalid_phone_is_rejected(number):
    with pytest.raises(RailResolutionError):
        RailResolver().resolve(number, MoneyRail.MTN_MOMO)


def test_unknown_rail_and_implicit_network_are_rejected():
    with pytest.raises(RailResolutionError):
        RailResolver().resolve("0551234567")
    with pytest.raises(RailResolutionError):
        RailResolver().resolve("0551234567", "UNKNOWN")


def test_bank_transfer_keeps_non_phone_destination():
    result = RailResolver().resolve("GH12BANK0001", MoneyRail.BANK_TRANSFER)
    assert result.normalized_destination == "GH12BANK0001"


def test_router_registration_selects_capable_provider():
    router = ProviderRouter(environment="test")
    provider = SandboxProvider()
    router.register(registration=ProviderRegistration(
        code="SANDBOX",
        rails=frozenset({MoneyRail.SANDBOX}),
        operations=frozenset({"SEND"}),
        capabilities=frozenset({ProviderCapability.SEND}),
        environment="test",
    ), adapter=provider)
    assert router.resolve("SEND", MoneyRail.SANDBOX) is provider


def test_router_fails_for_disabled_provider_unsupported_operation_and_rail():
    router = ProviderRouter(environment="test")
    provider = SandboxProvider()
    router.register(MoneyRail.SANDBOX, provider)
    with pytest.raises(ProviderRoutingError):
        router.resolve("REFUND", MoneyRail.SANDBOX)
    with pytest.raises(ProviderRoutingError):
        router.resolve("SEND", MoneyRail.MTN_MOMO)
    router.set_provider_enabled("SANDBOX", False)
    with pytest.raises(ProviderRoutingError):
        router.resolve("SEND", MoneyRail.SANDBOX)
    assert router.by_code("SANDBOX") is provider  # existing attempt recovery remains available


def test_router_preference_does_not_silently_fall_back():
    router = ProviderRouter(environment="test")
    provider = SandboxProvider()
    router.register(MoneyRail.SANDBOX, provider)
    with pytest.raises(ProviderRoutingError, match="Preferred provider"):
        router.resolve("SEND", MoneyRail.SANDBOX, preferred_provider_code="OTHER")


def test_production_router_has_no_implicit_sandbox():
    router = ProviderRouter(environment="production")
    with pytest.raises(ProviderRoutingError):
        router.resolve("SEND", MoneyRail.SANDBOX)
    with pytest.raises(ProviderRoutingError, match="cannot be registered"):
        router.register(MoneyRail.SANDBOX, SandboxProvider())


def test_provider_failure_classification_keeps_unknown_outcomes_ambiguous():
    assert classify_provider_result(ProviderStatus.SUCCEEDED) == FailureClassification.NONE
    assert classify_provider_result(ProviderStatus.IN_DOUBT) == FailureClassification.AMBIGUOUS
    assert classify_provider_result(ProviderStatus.FAILED) == FailureClassification.NON_RETRYABLE


def test_idempotency_key_is_bound_to_selected_rail(db_session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50_000, "GHS", "rail-idem-fund")
    db_session.commit()
    initiate_send(db_session, test_user.id, test_account.id, 1_000,
                  destination_address="0551234567", idempotency_key="rail-idem",
                  rail=MoneyRail.SANDBOX.value)
    with pytest.raises(ConstraintViolationException):
        initiate_send(db_session, test_user.id, test_account.id, 1_000,
                      destination_address="0551234567", idempotency_key="rail-idem",
                      rail=MoneyRail.MTN_MOMO.value)


def _signed_webhook(payload: dict, event_id: str):
    body = json.dumps(payload).encode()
    signature = hmac.new(_SANDBOX_WEBHOOK_SECRET, body, hashlib.sha256).hexdigest()
    return body, {"X-Sandbox-Signature": signature, "X-Sandbox-Event-Id": event_id}


def test_webhook_timestamp_rejects_replay_outside_window(db_session):
    provider = SandboxProvider()
    router = ProviderRouter(environment="test")
    router.register(MoneyRail.SANDBOX, provider)
    body, headers = provider.build_webhook_payload(
        ProviderEventType.TRANSACTION_SUCCEEDED, "unknown-ref", 100,
        event_id=str(uuid.uuid4()),
    )
    payload = json.loads(body)
    payload["occurred_at"] = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    body, headers = _signed_webhook(payload, headers["X-Sandbox-Event-Id"])
    with pytest.raises(ValueError, match="replay window"):
        MoneyMovementHub(router).ingest_webhook(db_session, "SANDBOX", body, headers)


def test_webhook_requires_timestamp_and_rejects_event_id_payload_reuse(db_session):
    provider = SandboxProvider()
    router = ProviderRouter(environment="test")
    router.register(MoneyRail.SANDBOX, provider)
    hub = MoneyMovementHub(router)
    event_id = str(uuid.uuid4())
    missing_timestamp = {
        "event_type": "UNKNOWN", "provider_reference": "orphan-ref",
        "provider_event_id": event_id,
        "amount_pesewas": 100, "currency": "GHS",
    }
    body, headers = _signed_webhook(missing_timestamp, event_id)
    with pytest.raises(ValueError, match="timestamp is required"):
        hub.ingest_webhook(db_session, "SANDBOX", body, headers)

    body, headers = provider.build_webhook_payload(
        ProviderEventType.TRANSACTION_SUCCEEDED, "orphan-ref", 100, event_id=event_id
    )
    first = hub.ingest_webhook(db_session, "SANDBOX", body, headers)
    assert first.processing_status == "ERROR"  # retained for reconciliation
    changed_body, changed_headers = provider.build_webhook_payload(
        ProviderEventType.TRANSACTION_SUCCEEDED, "orphan-ref", 200, event_id=event_id
    )
    with pytest.raises(ValueError, match="different payload"):
        hub.ingest_webhook(db_session, "SANDBOX", changed_body, changed_headers)
