import uuid
from sqlalchemy import String, ForeignKey, Integer, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing
import secrets

def generate_account_number() -> str:
    """Generate a non-sequential, customer-facing GHS account identifier."""
    return str(secrets.randbelow(900_000_000_000) + 100_000_000_000)

def generate_qr_token() -> str:
    """Opaque stable token used by the receiving QR; it contains no PII or DB id."""
    return secrets.token_urlsafe(24)

if typing.TYPE_CHECKING:
    from app.models.user import User
    from app.models.ledger_entry import LedgerEntry

class Account(BaseModel):
    __tablename__ = "accounts"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. MAIN, BANK, CASH
    account_number: Mapped[str] = mapped_column(String(12), unique=True, index=True, nullable=False, default=generate_account_number)
    qr_token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False, default=generate_qr_token)
    currency: Mapped[str] = mapped_column(String(3), CheckConstraint("currency = 'GHS'", name="chk_account_currency_ghs"), default="GHS", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    # Authoritative balances cached for fast reads. Must be updated within same transaction as ledger mutations.
    # By invariant: total_balance = available_balance + reserved_balance + locked_balance
    available_balance: Mapped[int] = mapped_column(Integer, CheckConstraint("available_balance >= 0", name="chk_positive_available"), default=0, nullable=False) # in pesewas
    reserved_balance: Mapped[int] = mapped_column(Integer, CheckConstraint("reserved_balance >= 0", name="chk_positive_reserved"), default=0, nullable=False)
    locked_balance: Mapped[int] = mapped_column(Integer, CheckConstraint("locked_balance >= 0", name="chk_positive_locked"), default=0, nullable=False)

    @property
    def total_balance(self) -> int:
        return self.available_balance + self.reserved_balance + self.locked_balance

    user: Mapped["User"] = relationship("User", back_populates="accounts")
    ledger_entries: Mapped[list["LedgerEntry"]] = relationship("LedgerEntry", back_populates="account", cascade="all, delete-orphan")

