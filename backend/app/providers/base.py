"""
providers/base.py
=================
Block 3: Provider interface and data contracts for the Money Movement Hub.

Architecture:
  FinancialOperation
      ↓
  MoneyMovementHub    (app.services.money_movement_hub)
      ↓
  ProviderRouter      (app.providers.router)
      ↓
  ProviderInterface   ← THIS MODULE defines the contract
      ↓
  ConcreteAdapter     (e.g. SandboxProvider, future MTNAdapter)
      ↓
  External Network

RULES:
  - The financial core ONLY speaks to ProviderInterface.
  - No provider SDK, HTTP library, or network credential appears in financial code.
  - Adapters declare their capabilities via CAPABILITIES class attribute.
  - The router checks capabilities before dispatching.

IN_DOUBT SEMANTICS:
  - ProviderStatus.IN_DOUBT means: request was sent, outcome is unknown.
  - This maps directly to TransactionStatus.IN_DOUBT.
  - IN_DOUBT is NOT failure. Funds remain reserved.
  - Resolution happens via status_query() or webhook.
"""
from __future__ import annotations

import enum
import hashlib
import hmac
from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol, Mapping, runtime_checkable

from app.models.money_rail import MoneyRail, ProviderCapability


# ─── Status enums ─────────────────────────────────────────────────────────────

class ProviderStatus(str, enum.Enum):
    SUCCEEDED = "SUCCEEDED"    # Provider confirms operation completed
    FAILED    = "FAILED"       # Provider confirms operation failed
    PENDING   = "PENDING"      # Provider accepted, outcome not yet known
    IN_DOUBT  = "IN_DOUBT"     # Request sent, no timely response (timeout / disconnect)


class FailureClassification(str, enum.Enum):
    NONE = "NONE"
    AMBIGUOUS = "AMBIGUOUS"
    RETRYABLE = "RETRYABLE"
    NON_RETRYABLE = "NON_RETRYABLE"
    ROUTING = "ROUTING"


def classify_provider_result(status: ProviderStatus) -> FailureClassification:
    """Classify normalized outcomes without retrying uncertain operations."""
    if status in (ProviderStatus.SUCCEEDED, ProviderStatus.PENDING):
        return FailureClassification.NONE
    if status == ProviderStatus.IN_DOUBT:
        return FailureClassification.AMBIGUOUS
    # FAILED is a definitive provider outcome. Potentially transient transport
    # failures must be normalized as IN_DOUBT by the adapter instead.
    return FailureClassification.NON_RETRYABLE


class ProviderEventType(str, enum.Enum):
    """Canonical provider event types for webhook payloads."""
    TRANSACTION_SUCCEEDED = "TRANSACTION_SUCCEEDED"
    TRANSACTION_FAILED    = "TRANSACTION_FAILED"
    TRANSACTION_PENDING   = "TRANSACTION_PENDING"
    REFUND_COMPLETED      = "REFUND_COMPLETED"
    UNKNOWN               = "UNKNOWN"


# ─── Request/result dataclasses ───────────────────────────────────────────────

@dataclass
class ProviderMovementRequest:
    """Unified request for any provider movement operation."""
    idempotency_key: str
    operation: str                    # FUND | SEND | PAY | WITHDRAW
    amount_pesewas: int
    currency: str
    rail: str                         # MoneyRail value
    source_address: str | None = None
    source_type: str | None = None
    destination_address: str | None = None
    destination_type: str | None = None
    merchant_code: str | None = None
    service_type: str | None = None
    metadata: dict = field(default_factory=dict)


@dataclass
class ProviderResult:
    """
    Returned by provider initiation calls.

    provider_reference: external ID assigned by the provider (None if call failed
                        before the provider assigned one or if IN_DOUBT).
    status:             outcome of THIS provider call.
    raw_response:       JSON-serializable dict of whatever the provider returned.
    error_code:         provider-specific error code if FAILED.
    error_message:      human-readable failure reason.
    """
    status: ProviderStatus
    provider_reference: str | None = None
    raw_response: dict = field(default_factory=dict)
    error_code: str | None = None
    error_message: str | None = None
    amount_pesewas: int | None = None
    currency: str | None = None


@dataclass
class ProviderStatusResult:
    """
    Returned by status_query() calls.

    Used to resolve an IN_DOUBT transaction by querying the provider.
    """
    provider_reference: str
    status: ProviderStatus
    amount_pesewas: int | None = None
    currency: str | None = None
    raw_response: dict = field(default_factory=dict)
    error_code: str | None = None
    error_message: str | None = None


@dataclass
class VerifiedProviderEvent:
    """
    Returned by verify_webhook() after signature verification.

    This is the normalised representation of a provider webhook event.
    Provider-specific fields are captured in raw_payload.
    """
    provider_code: str
    provider_event_id: str
    event_type: ProviderEventType
    provider_reference: str | None
    amount_pesewas: int | None
    currency: str | None
    raw_payload: dict = field(default_factory=dict)
    occurred_at: datetime | None = None


# ─── Protocol ─────────────────────────────────────────────────────────────────

@runtime_checkable
class ProviderInterface(Protocol):
    """
    Every provider adapter must implement this protocol.

    The CAPABILITIES class attribute declares what the adapter supports.
    The MoneyMovementHub checks capabilities before routing.

    Idempotency contract:
      - initiate() called twice with the same idempotency_key must return
        the same ProviderResult without creating duplicate external operations.
      - status_query() called multiple times must be safe (read-only).
      - verify_webhook() called multiple times with the same payload must
        return the same VerifiedProviderEvent (or raise the same error).
    """

    CAPABILITIES: set[ProviderCapability]

    @property
    def name(self) -> str:
        """Human-readable adapter name (e.g. 'SANDBOX', 'MTN')."""
        ...

    @property
    def supported_rails(self) -> set[MoneyRail]:
        """Set of rails this adapter can service."""
        ...

    def initiate(self, request: ProviderMovementRequest) -> ProviderResult:
        """
        Initiate an external money movement operation.

        Must be idempotent on request.idempotency_key.
        Returns IN_DOUBT if the request was sent but no timely response was received.
        """
        ...

    def status_query(self, provider_reference: str) -> ProviderStatusResult:
        """
        Query the current status of a previously initiated operation.

        Used to resolve IN_DOUBT transactions.
        Must only be called if the adapter declares STATUS_QUERY capability.
        """
        ...

    def verify_webhook(
        self,
        payload_bytes: bytes,
        headers: Mapping[str, str],
    ) -> VerifiedProviderEvent:
        """
        Authenticate and parse an inbound webhook payload.

        Raises ValueError if the payload cannot be verified (bad signature, etc.).
        Must only be called if the adapter declares WEBHOOKS capability.
        """
        ...


@runtime_checkable
class IdempotencyStatusQuery(Protocol):
    """Optional provider capability for recovering a lost-reference timeout."""

    def status_query_by_idempotency_key(self, idempotency_key: str) -> ProviderStatusResult:
        ...


# ─── Capability guard ─────────────────────────────────────────────────────────

def require_capability(adapter: ProviderInterface, capability: ProviderCapability) -> None:
    """Raise if the adapter does not declare the required capability."""
    if capability not in getattr(adapter, "CAPABILITIES", set()):
        raise NotImplementedError(
            f"Provider {adapter.name!r} does not support capability {capability.value!r}."
        )


# ─── Routing error ────────────────────────────────────────────────────────────

class ProviderRoutingError(Exception):
    """Raised when no suitable provider can be found for a given operation/rail."""
