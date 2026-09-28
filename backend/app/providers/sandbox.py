"""
providers/sandbox.py
====================
Enhanced Sandbox provider — simulates realistic external behaviour for all test scenarios.

Modes:
  success           → SUCCEEDED (default)
  failure           → FAILED
  timeout           → IN_DOUBT  (request sent, no response)
  pending           → PENDING   (provider accepted, async outcome)
  delayed_success   → IN_DOUBT initially, then SUCCEEDED on status_query
  delayed_failure   → IN_DOUBT initially, then FAILED on status_query
  duplicate_webhook → triggers duplicate webhook event simulation
  unknown_reference → status_query returns unknown reference error

This is a deterministic first-party sandbox, not a mock framework.
Tests rely on it exactly as production code relies on real providers.
No real network calls are made.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone
from typing import Literal, Mapping

from app.models.money_rail import MoneyRail, ProviderCapability
from app.providers.base import (
    ProviderCapability,
    ProviderEventType,
    ProviderInterface,
    ProviderMovementRequest,
    ProviderResult,
    ProviderStatus,
    ProviderStatusResult,
    VerifiedProviderEvent,
)


SandboxMode = Literal[
    "success",
    "failure",
    "timeout",
    "pending",
    "delayed_success",
    "delayed_failure",
    "unknown_reference",
    "provider_error",
    "duplicate_webhook",
    "out_of_order_webhook",
]

# Stable HMAC key used for sandbox webhook signature generation
_SANDBOX_WEBHOOK_SECRET = b"sandbox-webhook-secret-do-not-use-in-production"


class SandboxProvider:
    """
    Sandbox implementation of ProviderInterface.

    Deterministic: same idempotency_key + mode → same result always.
    Supports all ProviderCapabilities for testing purposes.
    """

    PROVIDER_NAME = "SANDBOX"

    CAPABILITIES: set[ProviderCapability] = {
        ProviderCapability.FUND,
        ProviderCapability.SEND,
        ProviderCapability.PAY,
        ProviderCapability.WITHDRAW,
        ProviderCapability.STATUS_QUERY,
        ProviderCapability.STATUS_QUERY_BY_IDEMPOTENCY_KEY,
        ProviderCapability.WEBHOOKS,
    }

    RAILS: set[MoneyRail] = {MoneyRail.SANDBOX}

    def __init__(self, mode: SandboxMode = "success") -> None:
        valid_modes = (
            "success", "failure", "timeout", "pending",
            "delayed_success", "delayed_failure", "unknown_reference",
            "provider_error", "duplicate_webhook", "out_of_order_webhook",
        )
        if mode not in valid_modes:
            raise ValueError(f"Invalid sandbox mode: {mode!r}. Valid: {valid_modes}")
        self.mode = mode
        self._operations: dict[str, tuple[int, str]] = {}
        self._idempotency_references: dict[str, str] = {}

    @property
    def name(self) -> str:
        return self.PROVIDER_NAME

    @property
    def supported_rails(self) -> set[MoneyRail]:
        return self.RAILS

    # ── Reference generation ─────────────────────────────────────────────────

    def _make_reference(self, operation: str, idempotency_key: str) -> str:
        """Deterministic sandbox reference — same key always produces the same reference."""
        return f"SANDBOX-{operation.upper()}-{idempotency_key}"

    # ── initiate() ───────────────────────────────────────────────────────────

    def initiate(self, request: ProviderMovementRequest) -> ProviderResult:
        """
        Route to the appropriate mode handler.
        All sandbox modes are handled here regardless of operation type.
        """
        ref = self._make_reference(request.operation, request.idempotency_key)
        self._operations[ref] = (request.amount_pesewas, request.currency)
        self._idempotency_references[request.idempotency_key] = ref
        raw_base = {
            "sandbox": True,
            "provider": self.PROVIDER_NAME,
            "mode": self.mode,
            "operation": request.operation,
            "idempotency_key": request.idempotency_key,
            "reference": ref,
            "amount_pesewas": request.amount_pesewas,
            "currency": request.currency,
        }

        if self.mode in ("success", "duplicate_webhook", "out_of_order_webhook"):
            return ProviderResult(
                status=ProviderStatus.SUCCEEDED,
                provider_reference=ref,
                raw_response=raw_base,
                amount_pesewas=request.amount_pesewas,
                currency=request.currency,
            )

        elif self.mode == "failure":
            return ProviderResult(
                status=ProviderStatus.FAILED,
                provider_reference=None,
                raw_response={**raw_base, "error": "SANDBOX_SIMULATED_FAILURE"},
                error_code="SANDBOX_SIMULATED_FAILURE",
                error_message="Sandbox simulated provider failure.",
            )

        elif self.mode == "timeout":
            # Request was sent but no response arrived — IN_DOUBT
            # provider_reference is None because we never got confirmation the provider
            # received and assigned an ID. In a real timeout, we may or may not have a ref.
            return ProviderResult(
                status=ProviderStatus.IN_DOUBT,
                provider_reference=None,
                raw_response={**raw_base, "error": "SANDBOX_TIMEOUT"},
                error_code="SANDBOX_TIMEOUT",
                error_message="Sandbox simulated provider timeout — outcome unknown.",
            )

        elif self.mode in ("delayed_success", "delayed_failure"):
            # Provider accepted but outcome is async — we have a reference but no final status yet.
            # IN_DOUBT with a reference means we CAN query status.
            return ProviderResult(
                status=ProviderStatus.IN_DOUBT,
                provider_reference=ref,
                raw_response={**raw_base, "note": "async outcome pending"},
                error_code="SANDBOX_ASYNC_PENDING",
                error_message="Sandbox: request accepted, outcome deferred.",
            )

        elif self.mode == "pending":
            return ProviderResult(
                status=ProviderStatus.PENDING,
                provider_reference=ref,
                raw_response={**raw_base, "note": "outcome deferred"},
            )

        elif self.mode == "unknown_reference":
            return ProviderResult(
                status=ProviderStatus.FAILED,
                provider_reference=None,
                raw_response={**raw_base, "error": "UNKNOWN_REFERENCE"},
                error_code="UNKNOWN_REFERENCE",
                error_message="Sandbox: no provider reference resolved.",
            )

        elif self.mode == "provider_error":
            # The request may already have reached the provider; the hub must
            # preserve uncertainty rather than treating this as a confirmed failure.
            raise RuntimeError("Sandbox simulated ambiguous provider error.")

        # Fallback (should not reach here)
        return ProviderResult(
            status=ProviderStatus.FAILED,
            raw_response=raw_base,
            error_code="SANDBOX_UNKNOWN_MODE",
            error_message=f"Unknown sandbox mode: {self.mode}",
        )

    # ── status_query() ───────────────────────────────────────────────────────

    def status_query(self, provider_reference: str) -> ProviderStatusResult:
        """
        Resolve the status of an IN_DOUBT operation.

        - delayed_success mode → returns SUCCEEDED
        - delayed_failure mode → returns FAILED
        - unknown_reference   → raises ValueError (unknown reference)
        - other modes         → returns SUCCEEDED (happy path)
        """
        if self.mode == "unknown_reference":
            raise ValueError(
                f"Sandbox status_query: provider_reference {provider_reference!r} not found."
            )

        if provider_reference not in self._operations:
            raise ValueError(f"Sandbox status_query: unknown reference {provider_reference!r}.")
        amount, currency = self._operations[provider_reference]

        if self.mode == "delayed_failure":
            return ProviderStatusResult(
                provider_reference=provider_reference,
                status=ProviderStatus.FAILED,
                amount_pesewas=amount,
                currency=currency,
                raw_response={
                    "sandbox": True,
                    "status_query": True,
                    "mode": self.mode,
                    "provider_reference": provider_reference,
                },
                error_code="SANDBOX_DELAYED_FAILURE",
                error_message="Sandbox: delayed failure confirmed.",
            )

        # Default: SUCCEEDED (covers success, delayed_success, etc.)
        return ProviderStatusResult(
            provider_reference=provider_reference,
            status=ProviderStatus.SUCCEEDED,
            amount_pesewas=amount,
            currency=currency,
            raw_response={
                "sandbox": True,
                "status_query": True,
                "mode": self.mode,
                "provider_reference": provider_reference,
            },
        )

    def status_query_by_idempotency_key(self, idempotency_key: str) -> ProviderStatusResult:
        """Sandbox recovery path for a response lost before Arezak got a reference."""
        reference = self._idempotency_references.get(idempotency_key)
        if reference is None:
            raise ValueError("Sandbox status query found no matching idempotency key.")
        return self.status_query(reference)

    # ── verify_webhook() ─────────────────────────────────────────────────────

    def verify_webhook(
        self,
        payload_bytes: bytes,
        headers: Mapping[str, str],
    ) -> VerifiedProviderEvent:
        """
        Authenticate and parse a sandbox webhook payload.

        Expected headers:
          X-Sandbox-Signature: HMAC-SHA256 hex digest of payload_bytes
          X-Sandbox-Event-Id:  unique event identifier

        Payload is JSON with fields:
          event_type, provider_reference, amount_pesewas, currency

        Raises ValueError on bad signature or missing fields.
        """
        # Verify signature
        sig_header = headers.get("X-Sandbox-Signature") or headers.get("x-sandbox-signature")
        if not sig_header:
            raise ValueError("Missing X-Sandbox-Signature header.")

        expected_sig = hmac.new(
            _SANDBOX_WEBHOOK_SECRET,
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, sig_header.lower()):
            raise ValueError("Sandbox webhook signature verification failed.")

        # Parse payload
        try:
            payload = json.loads(payload_bytes.decode("utf-8"))
        except Exception as e:
            raise ValueError(f"Invalid webhook payload: {e}") from e

        event_id = headers.get("X-Sandbox-Event-Id") or headers.get("x-sandbox-event-id")
        if not event_id:
            raise ValueError("Missing X-Sandbox-Event-Id header.")
        if payload.get("provider_event_id") != event_id:
            raise ValueError("Sandbox event ID does not match the signed payload.")

        raw_event_type = payload.get("event_type", "UNKNOWN")
        try:
            event_type = ProviderEventType(raw_event_type)
        except ValueError:
            event_type = ProviderEventType.UNKNOWN

        occurred_at = None
        if payload.get("occurred_at") is not None:
            try:
                occurred_at = datetime.fromisoformat(
                    str(payload["occurred_at"]).replace("Z", "+00:00")
                )
                if occurred_at.tzinfo is None:
                    raise ValueError
            except ValueError as exc:
                raise ValueError("Invalid webhook occurred_at timestamp.") from exc

        return VerifiedProviderEvent(
            provider_code=self.PROVIDER_NAME,
            provider_event_id=event_id,
            event_type=event_type,
            provider_reference=payload.get("provider_reference"),
            amount_pesewas=payload.get("amount_pesewas"),
            currency=payload.get("currency"),
            raw_payload=payload,
            occurred_at=occurred_at,
        )

    # ── Webhook builder (test helper) ────────────────────────────────────────

    def build_webhook_payload(
        self,
        event_type: ProviderEventType,
        provider_reference: str,
        amount_pesewas: int,
        currency: str = "GHS",
        event_id: str | None = None,
    ) -> tuple[bytes, dict[str, str]]:
        """
        Build a valid signed webhook payload + headers for testing.

        Returns (payload_bytes, headers_dict).
        """
        event_id = event_id or str(uuid.uuid4())
        payload = {
            "event_type": event_type.value,
            "provider_event_id": event_id,
            "provider_reference": provider_reference,
            "amount_pesewas": amount_pesewas,
            "currency": currency,
            "sandbox": True,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }
        payload_bytes = json.dumps(payload).encode("utf-8")
        sig = hmac.new(
            _SANDBOX_WEBHOOK_SECRET,
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        headers = {
            "X-Sandbox-Signature": sig,
            "X-Sandbox-Event-Id": event_id,
            "Content-Type": "application/json",
        }
        return payload_bytes, headers

    def webhook_scenario(self, provider_reference: str, amount_pesewas: int,
                         currency: str = "GHS") -> list[tuple[bytes, dict[str, str]]]:
        """Return deterministic deliveries for duplicate/out-of-order scenarios."""
        success = self.build_webhook_payload(
            ProviderEventType.TRANSACTION_SUCCEEDED, provider_reference,
            amount_pesewas, currency, event_id=f"{provider_reference}-success",
        )
        if self.mode == "duplicate_webhook":
            return [success, success]
        if self.mode == "out_of_order_webhook":
            pending = self.build_webhook_payload(
                ProviderEventType.TRANSACTION_PENDING, provider_reference,
                amount_pesewas, currency, event_id=f"{provider_reference}-pending",
            )
            # Deliberately deliver final status before the earlier pending event.
            return [success, pending]
        return [success]



    def fund(self, idempotency_key, **kw):
        return _sandbox_legacy_method(self.mode, "FUND", idempotency_key, **kw)
    def send(self, idempotency_key, **kw):
        return _sandbox_legacy_method(self.mode, "SEND", idempotency_key, **kw)
    def pay(self, idempotency_key, **kw):
        return _sandbox_legacy_method(self.mode, "PAY", idempotency_key, **kw)
    def withdraw(self, idempotency_key, **kw):
        return _sandbox_legacy_method(self.mode, "WITHDRAW", idempotency_key, **kw)

# ─── Legacy-compat: expose old call-style methods for Block 2 tests ───────────
# These forward to initiate() so existing tests continue to work.

def _sandbox_legacy_method(mode: str, operation: str, idempotency_key: str, **kw):
    provider = SandboxProvider(mode=mode)
    req = ProviderMovementRequest(
        idempotency_key=idempotency_key,
        operation=operation,
        amount_pesewas=kw.get("amount_pesewas", 0),
        currency=kw.get("currency", "GHS"),
        rail=MoneyRail.SANDBOX.value,
        source_address=kw.get("source_address"),
        source_type=kw.get("source_type"),
        destination_address=kw.get("destination_address"),
        destination_type=kw.get("destination_type"),
        merchant_code=kw.get("merchant_code"),
        service_type=kw.get("service_type"),
    )
    return provider.initiate(req)
