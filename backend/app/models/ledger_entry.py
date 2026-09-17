import uuid
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.account import Account
    from app.models.transaction import Transaction

class LedgerEntry(BaseModel):
    __tablename__ = "ledger_entries"
    
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False, index=True)
    
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False) # "CREDIT" or "DEBIT"
    amount: Mapped[int] = mapped_column(Integer, nullable=False) # ALWAYS POSITIVE absolute pesewas
    currency: Mapped[str] = mapped_column(String(3), default="GHS", nullable=False)
    
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    account: Mapped["Account"] = relationship("Account", back_populates="ledger_entries")
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="ledger_entries")

