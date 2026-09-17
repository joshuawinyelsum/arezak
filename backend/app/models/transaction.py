import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.user import User
    from app.models.ledger_entry import LedgerEntry

class Transaction(BaseModel):
    __tablename__ = "transactions"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # The initiating or primary account for the transaction (optional, since it could span multiple)
    # We will keep it for easy querying of user's primary transactions
    account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True, index=True)
    
    type: Mapped[str] = mapped_column(String(50), nullable=False) # INCOME, EXPENSE, TRANSFER, etc.
    amount: Mapped[int] = mapped_column(Integer, nullable=False) # absolute pesewas amount
    currency: Mapped[str] = mapped_column(String(3), default="GHS", nullable=False)
    
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    destination_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="COMPLETED", nullable=False)
    
    # Idempotency key to prevent double processing
    reference: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    funding_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Lineage for transaction correction
    reverses_transaction_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True)
    correction_of_transaction_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="transactions")
    ledger_entries: Mapped[list["LedgerEntry"]] = relationship("LedgerEntry", back_populates="transaction", cascade="all, delete-orphan")

