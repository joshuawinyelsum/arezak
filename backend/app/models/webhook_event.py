"""
webhook_event.py
================
WebhookEvent: durable, deduplicated record of every provider webhook received.

Webhook delivery is at-least-once. The same event may arrive multiple times.
The unique constraint on (provider_code, provider_event_id) prevents double-processing.

Processing flow:
  POST /webhooks/{provider}
       ↓
  authenticate/verify
       ↓
  deduplicate by provider_event_id
       ↓
  persist raw event (this model)
       ↓
  resolve provider_reference → ProviderAttempt → Transaction
       ↓
  apply financial effect via lifecycle (if state transition is legal)
       ↓
  mark webhook PROCESSED
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import String, Text, CheckConstraint, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class WebhookProcessingStatus(str):
    RECEIVED   = "RECEIVED"    # Persisted, not yet processed
    PROCESSING = "PROCESSING"  # Currently being processed
    PROCESSED  = "PROCESSED"   # Successfully applied
    DUPLICATE  = "DUPLICATE"   # Recognised duplicate, ignored
    REJECTED   = "REJECTED"    # Invalid/unverifiable event
    ERROR      = "ERROR"       # Processing failed (see error_message)


class WebhookEvent(BaseModel):
    """
    Immutable record of every webhook received from any external provider.

    Idempotency: provider_code + provider_event_id must be unique.
    If a duplicate arrives, the existing record is found and returned
    without re-applying the financial effect.
    """
    __tablename__ = "webhook_events"

    __table_args__ = (
        UniqueConstraint(
            "provider_code", "provider_event_id",
            name="uq_webhook_events_provider_event",
        ),
        CheckConstraint(
            "processing_status IN ('RECEIVED','PROCESSING','PROCESSED','DUPLICATE','REJECTED','ERROR')",
            name="chk_webhook_processing_status",
        ),
    )

    # Which provider sent this webhook
    provider_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Provider's own unique event identifier — used for deduplication
    provider_event_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Provider's event type / category
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # The provider reference this webhook refers to (links to ProviderAttempt)
    provider_reference: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )

    # SHA-256 hash of the raw payload bytes — for integrity verification
    payload_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Raw payload stored as text (JSON string)
    payload: Mapped[str] = mapped_column(Text, nullable=False)

    # Current processing status
    processing_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default=WebhookProcessingStatus.RECEIVED
    )

    # When this webhook was received at our endpoint
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # When this webhook finished processing (null if not yet processed)
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # If processing failed, why
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Which Arezak transaction was resolved by this webhook (populated on success)
    resolved_transaction_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
