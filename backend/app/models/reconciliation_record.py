"""Durable evidence from a provider reconciliation check."""
import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class ReconciliationRecord(BaseModel):
    __tablename__ = "reconciliation_records"

    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True, index=True
    )
    provider_attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("provider_attempts.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    discrepancy_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    evidence_json: Mapped[str] = mapped_column(Text, nullable=False)
