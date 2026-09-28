import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, Integer, DateTime, CheckConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.user import User
    from app.models.ledger_entry import LedgerEntry
    from app.models.provider_attempt import ProviderAttempt

from sqlalchemy import Enum
import enum


class TransactionStatus(str, enum.Enum):
    """
    Explicit transaction lifecycle state machine.

    Legal transitions:
      PENDING     → PROCESSING (provider call dispatched)
      PENDING     → FAILED     (rejected before provider, e.g. validation)
      PENDING     → CANCELLED  (cancelled before processing)
      PROCESSING  → COMPLETED  (provider confirmed success)
      PROCESSING  → FAILED     (provider confirmed failure or timeout resolution)
      PROCESSING  → CANCELLED  (cancelled mid-flight — rare, only via explicit provider cancel)

    Terminal states: COMPLETED, FAILED, CANCELLED
    Internal-only operations (goal contribution, correction) go directly COMPLETED.
    """
    PENDING    = 'PENDING'
    PROCESSING = 'PROCESSING'
    COMPLETED  = 'COMPLETED'
    FAILED     = 'FAILED'
    CANCELLED  = 'CANCELLED'
    IN_DOUBT   = 'IN_DOUBT'

    @classmethod
    def terminal_states(cls) -> set:
        # Note: IN_DOUBT is not terminal
        return {cls.COMPLETED, cls.FAILED, cls.CANCELLED}

    @classmethod
    def legal_transitions(cls) -> dict:
        return {
            cls.PENDING:    {cls.PROCESSING, cls.FAILED, cls.CANCELLED},
            cls.PROCESSING: {cls.COMPLETED, cls.FAILED, cls.CANCELLED, cls.IN_DOUBT},
            cls.IN_DOUBT:   {cls.COMPLETED, cls.FAILED},
            cls.COMPLETED:  set(),
            cls.FAILED:     set(),
            cls.CANCELLED:  set(),
        }

    def can_transition_to(self, target: 'TransactionStatus') -> bool:
        return target in self.legal_transitions().get(self, set())


class TransactionType(str, enum.Enum):
    # ── Legacy / internal types (Block 1) ──────────────────────────────────
    INCOME           = 'INCOME'           # Manual income entry
    EXPENSE          = 'EXPENSE'          # Manual expense entry (legacy)
    SPEND            = 'SPEND'            # Internal spend (legacy alias)
    TRANSFER_OUT     = 'TRANSFER_OUT'     # Legacy outbound transfer
    TRANSFER         = 'TRANSFER'         # Internal transfer (legacy)
    GOAL_CONTRIBUTION = 'GOAL_CONTRIBUTION'
    GOAL_WITHDRAWAL  = 'GOAL_WITHDRAWAL'
    CORRECTION_REVERSAL = 'CORRECTION_REVERSAL'
    CORRECTION_APPLY = 'CORRECTION_APPLY'
    FEE              = 'FEE'              # Fee entry (child of another tx)

    # ── Block 2 domain operations ───────────────────────────────────────────
    FUND             = 'FUND'             # External money into Arezak
    SEND             = 'SEND'            # Money to another person/account
    PAY              = 'PAY'             # Merchant / bill / service payment
    WITHDRAW         = 'WITHDRAW'        # Arezak available → external cash out

    # Which types are external (require provider interaction)?
    @classmethod
    def external_types(cls) -> set:
        return {cls.FUND, cls.SEND, cls.PAY, cls.WITHDRAW}

    # Which types debit available (for rules engine)?
    @classmethod
    def debit_types(cls) -> set:
        return {cls.SPEND, cls.TRANSFER_OUT, cls.EXPENSE,
                cls.GOAL_CONTRIBUTION, cls.SEND, cls.PAY, cls.WITHDRAW}


class DestinationType(str, enum.Enum):
    """Neutral destination abstraction. Provider determines HOW to reach it."""
    AREZAK_USER   = 'AREZAK_USER'
    MOBILE_MONEY  = 'MOBILE_MONEY'
    BANK          = 'BANK'
    MERCHANT      = 'MERCHANT'
    SERVICE       = 'SERVICE'   # airtime, electricity, etc.
    EXTERNAL      = 'EXTERNAL'  # generic/unclassified


class Transaction(BaseModel):
    __tablename__ = "transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Primary account for this transaction (for fast user-level querying)
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True, index=True
    )

    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, name="transaction_type_enum"), nullable=False
    )
    amount: Mapped[int] = mapped_column(
        Integer,
        CheckConstraint("amount > 0", name="chk_transaction_amount_positive"),
        nullable=False,
    )  # absolute pesewas — the user-requested amount, NOT including fee
    currency: Mapped[str] = mapped_column(
        String(3),
        CheckConstraint("currency = 'GHS'", name="chk_transaction_currency_ghs"),
        default="GHS",
        nullable=False,
    )

    # ── Lifecycle ───────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(50),
        CheckConstraint(
            "status IN ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED','IN_DOUBT')",
            name="chk_transaction_status",
        ),
        default=TransactionStatus.COMPLETED.value,
        nullable=False,
    )

    # ── Idempotency ─────────────────────────────────────────────────────────
    reference: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )

    # ── Destination / routing ───────────────────────────────────────────────
    # Provider-independent rail selected for this external operation.
    rail: Mapped[str | None] = mapped_column(String(50), nullable=True)
    destination_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    destination_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Legacy untyped FKs kept for backward compat; prefer destination_type/address for new code
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    destination_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    recipient_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True, index=True
    )

    # ── Fees ────────────────────────────────────────────────────────────────
    fee_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # pesewas
    # fee_for_transaction_id: the FEE tx that covers this tx (populated on FEE rows)
    fee_for_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True
    )

    # ── Provider tracing ────────────────────────────────────────────────────
    provider_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_reference: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Metadata ────────────────────────────────────────────────────────────
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    funding_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Correction lineage ──────────────────────────────────────────────────
    reverses_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True
    )
    correction_of_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True
    )

    # ── Relationships ───────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="transactions")
    ledger_entries: Mapped[list["LedgerEntry"]] = relationship(
        "LedgerEntry", back_populates="transaction", cascade="all, delete-orphan"
    )
    provider_attempts: Mapped[list["ProviderAttempt"]] = relationship(
        "ProviderAttempt", back_populates="transaction",
        foreign_keys="[ProviderAttempt.transaction_id]",
        cascade="all, delete-orphan",
    )

