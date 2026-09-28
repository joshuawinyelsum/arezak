"""
provider_attempt.py
====================
ProviderAttempt: durable record of a single external provider call attempt.

One Arezak Transaction may generate multiple ProviderAttempt rows:
  - First attempt → TIMED_OUT → IN_DOUBT
  - Status inquiry confirms SUCCEEDED → ProviderAttempt 1 updated
  - (No retry attempt is created without resolving the first)

Sequence:
  Transaction (Arezak state) ← owns → ProviderAttempt (network state)
                                               ↓
                                       WebhookEvent (raw provider event)

Financial source of truth: LedgerEntry table.
This table records the conversation with the external world.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, Integer, Text, CheckConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

import typing
from app.models.base import BaseModel

if typing.TYPE_CHECKING:
    from app.models.transaction import Transaction


class AttemptStatus(str):
    """String constants for provider attempt status. Not an enum to allow future extension."""
    PENDING     = "PENDING"      # Created, not yet dispatched
    DISPATCHED  = "DISPATCHED"   # Request sent to provider
    SUCCEEDED   = "SUCCEEDED"    # Provider confirmed success
    FAILED      = "FAILED"       # Provider confirmed failure
    IN_DOUBT    = "IN_DOUBT"     # Sent, but outcome unknown (timeout/disconnect)


class ProviderAttempt(BaseModel):
    """
    Durable record of a single attempt to contact an external provider.

    One Arezak Transaction may have multiple ProviderAttempts if the first
    attempt was IN_DOUBT and resolution required a new attempt. However,
    Arezak must NEVER create a new ProviderAttempt without first resolving
    the previous IN_DOUBT attempt (to prevent double-spending).
    """
    __tablename__ = "provider_attempts"

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING','DISPATCHED','SUCCEEDED','FAILED','IN_DOUBT')",
            name="chk_provider_attempt_status",
        ),
        CheckConstraint(
            "amount_pesewas > 0",
            name="chk_provider_attempt_amount_positive",
        ),
        CheckConstraint(
            "attempt_number > 0",
            name="chk_provider_attempt_number_positive",
        ),
    )

    # Parent Arezak transaction
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False, index=True
    )

    # Provider adapter code (e.g. "SANDBOX", "MTN", "TELECEL")
    provider_code: Mapped[str] = mapped_column(String(50), nullable=False)

    # The rail this attempt was routed through
    rail: Mapped[str] = mapped_column(String(50), nullable=False)

    # Operation type mirrors transaction type
    operation: Mapped[str] = mapped_column(String(50), nullable=False)

    # Attempt ordinal within the transaction (1-based)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Current status of this attempt
    status: Mapped[str] = mapped_column(String(50), nullable=False, default=AttemptStatus.PENDING)

    # Stable idempotency key sent to the provider for THIS attempt
    # Constructed as: {transaction_id}_{attempt_number}
    provider_idempotency_key: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True, unique=True
    )

    # Provider's own reference for this call once assigned
    provider_reference: Mapped[str | None] = mapped_column(
        String(255), index=True, nullable=True
    )

    # Amount actually sent to provider (pesewas)
    amount_pesewas: Mapped[int] = mapped_column(Integer, nullable=False)

    # Destination as sent to the provider
    destination_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Raw request/response payloads for full audit trail
    request_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_payload: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Error detail
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Timestamps for the full request/response cycle
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    transaction: Mapped["Transaction"] = relationship(
        "Transaction", back_populates="provider_attempts", foreign_keys=[transaction_id]
    )
