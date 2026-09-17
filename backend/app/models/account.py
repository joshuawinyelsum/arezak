import uuid
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.user import User
    from app.models.ledger_entry import LedgerEntry

class Account(BaseModel):
    __tablename__ = "accounts"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. MAIN, BANK, CASH
    currency: Mapped[str] = mapped_column(String(3), default="GHS", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    # Authoritative balances cached for fast reads. Must be updated within same transaction as ledger mutations.
    # By invariant: total_balance = available_balance + reserved_balance + locked_balance
    available_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False) # in pesewas
    reserved_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    @property
    def total_balance(self) -> int:
        return self.available_balance + self.reserved_balance + self.locked_balance

    user: Mapped["User"] = relationship("User", back_populates="accounts")
    ledger_entries: Mapped[list["LedgerEntry"]] = relationship("LedgerEntry", back_populates="account", cascade="all, delete-orphan")

