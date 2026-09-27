import uuid
from sqlalchemy import String, ForeignKey, Integer, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.account import Account
    from app.models.transaction import Transaction

class LedgerEntry(BaseModel):
    __tablename__ = "ledger_entries"
    
    account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True, index=True)
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False, index=True)
    
    balance_type: Mapped[str] = mapped_column(String(50), CheckConstraint("balance_type IN ('AVAILABLE', 'LOCKED', 'RESERVED', 'EXTERNAL')", name="chk_ledger_balance_type"), default="AVAILABLE", nullable=False)
    entry_type: Mapped[str] = mapped_column(String(10), CheckConstraint("entry_type IN ('CREDIT', 'DEBIT')", name="chk_ledger_entry_type"), nullable=False) # "CREDIT" or "DEBIT"
    amount: Mapped[int] = mapped_column(Integer, CheckConstraint("amount > 0", name="chk_ledger_amount_positive"), nullable=False) # ALWAYS POSITIVE absolute pesewas
    currency: Mapped[str] = mapped_column(String(3), CheckConstraint("currency = 'GHS'", name="chk_ledger_currency_ghs"), default="GHS", nullable=False)
    
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    account: Mapped["Account"] = relationship("Account", back_populates="ledger_entries")
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="ledger_entries")

