"""
money_rail.py
=============
Provider-independent representation of a money movement rail.

A "rail" is a payment network/channel that money can travel through:
  MTN_MOMO, TELECEL_CASH, AIRTELTIGO_MONEY, BANK_TRANSFER, etc.

Rails are separate from providers. Multiple providers may support the same rail.
The provider router selects which provider handles a given rail.

This separation means:
  - Arezak code references rails (stable identifiers)
  - Provider assignment can change without touching financial logic
"""
import uuid
import enum

from sqlalchemy import String, Boolean, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class MoneyRail(str, enum.Enum):
    """
    Canonical money rails supported by Arezak.

    Naming convention: NETWORK_PRODUCT, uppercase.
    New rails are added here, not scattered in provider code.
    """
    MTN_MOMO          = "MTN_MOMO"
    TELECEL_CASH      = "TELECEL_CASH"
    AIRTELTIGO_MONEY  = "AIRTELTIGO_MONEY"
    BANK_TRANSFER     = "BANK_TRANSFER"
    INTERNAL_AREZAK   = "INTERNAL_AREZAK"
    SANDBOX           = "SANDBOX"       # Used in tests and development only
    UNKNOWN           = "UNKNOWN"       # Unresolved / unrecognised destination


class ProviderCapability(str, enum.Enum):
    """
    Explicit capability flags for provider adapters.

    A provider should declare which capabilities it supports.
    The router checks capabilities before dispatching.
    """
    FUND          = "FUND"           # Receive money from external source
    SEND          = "SEND"           # Send money to external recipient
    PAY           = "PAY"            # Pay merchant/bill/service
    WITHDRAW      = "WITHDRAW"       # Withdraw to external destination
    STATUS_QUERY  = "STATUS_QUERY"   # Can query status of a pending operation
    STATUS_QUERY_BY_IDEMPOTENCY_KEY = "STATUS_QUERY_BY_IDEMPOTENCY_KEY"
    WEBHOOKS      = "WEBHOOKS"       # Provider delivers webhooks
    REFUNDS       = "REFUNDS"        # Supports refund initiation
    REVERSALS     = "REVERSALS"      # Supports reversal of completed txns


class ProviderRecord(BaseModel):
    """
    Registry of external provider adapters known to Arezak.

    This is an internal/admin-managed record — NOT user-facing.
    Credentials are NOT stored here; they live in environment config.
    """
    __tablename__ = "providers"

    # Short machine-readable code (e.g. "SANDBOX", "MTN", "TELECEL")
    code: Mapped[str] = mapped_column(
        String(50),
        CheckConstraint("length(code) > 0", name="chk_provider_code_nonempty"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Human display name
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Which rails this provider can service (comma-separated MoneyRail values)
    supported_rails: Mapped[str] = mapped_column(
        Text, nullable=False, default=""
    )  # e.g. "MTN_MOMO,TELECEL_CASH"

    # Which capabilities this provider supports (comma-separated ProviderCapability values)
    capabilities: Mapped[str] = mapped_column(
        Text, nullable=False, default=""
    )

    # Whether provider is currently accepting new operations
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Human notes / description
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def get_supported_rails(self) -> list[str]:
        return [r.strip() for r in self.supported_rails.split(",") if r.strip()]

    def get_capabilities(self) -> list[str]:
        return [c.strip() for c in self.capabilities.split(",") if c.strip()]

    def supports_rail(self, rail: MoneyRail | str) -> bool:
        rail_val = rail.value if isinstance(rail, MoneyRail) else rail
        return rail_val in self.get_supported_rails()

    def has_capability(self, capability: ProviderCapability | str) -> bool:
        cap_val = capability.value if isinstance(capability, ProviderCapability) else capability
        return cap_val in self.get_capabilities()
