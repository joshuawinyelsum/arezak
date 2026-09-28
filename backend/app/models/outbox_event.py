"""
outbox_event.py
===============
Transactional Outbox pattern for reliable async dispatch.

The critical invariant:
  Transaction state change + Reservation + Outbox event
  must all commit atomically in one database transaction.

Then an async worker picks up PENDING outbox events and processes them.

This prevents the dangerous split-brain state:
  database committed → BUT → worker job never created (crash, process restart)

Pattern:
  1. Financial operation creates Transaction + ProviderAttempt + OutboxEvent in one tx
  2. Worker polls for PENDING outbox events
  3. Worker calls provider adapter
  4. Worker updates ProviderAttempt + Transaction status
  5. Worker marks OutboxEvent as PROCESSED

If the worker crashes between steps 3 and 4:
  - Outbox event stays PENDING (or is marked IN_DOUBT)
  - Worker retries (with same provider_idempotency_key)
  - Provider deduplicates using idempotency key
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Integer, CheckConstraint, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class OutboxStatus(str):
    PENDING    = "PENDING"     # Waiting to be processed
    PROCESSING = "PROCESSING"  # Currently being processed by a worker
    DONE       = "DONE"        # Successfully dispatched
    FAILED     = "FAILED"      # Permanently failed (exhausted retries)


class OutboxEvent(BaseModel):
    """
    Transactional outbox entry for reliable async dispatch.

    An OutboxEvent is created inside the same database transaction that
    creates the ProviderAttempt and reserves funds. The worker processes
    it asynchronously.
    """
    __tablename__ = "outbox_events"

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING','PROCESSING','DONE','FAILED')",
            name="chk_outbox_status",
        ),
    )

    # Which transaction triggered this outbox event
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False, index=True
    )

    # Which provider attempt this corresponds to
    provider_attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("provider_attempts.id"), nullable=False, index=True
    )

    # Event type (e.g. "INITIATE_FUND", "INITIATE_SEND", "STATUS_QUERY", "RESOLVE_IN_DOUBT")
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # Serialized event payload (JSON)
    payload: Mapped[str] = mapped_column(Text, nullable=False)

    # Current processing status
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default=OutboxStatus.PENDING, index=True
    )

    # How many times this event has been attempted by a worker
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Earliest time this event should be picked up (for retry backoff)
    process_after: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # When processing last started
    last_attempted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Error detail if FAILED
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
