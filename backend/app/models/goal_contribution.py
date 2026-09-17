import uuid
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.goal import Goal
    from app.models.transaction import Transaction

class GoalContribution(BaseModel):
    __tablename__ = "goal_contributions"
    
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # We keep a reference to the main transaction that moved the money
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False, unique=True)
    
    amount: Mapped[int] = mapped_column(Integer, nullable=False) # pesewas
    currency: Mapped[str] = mapped_column(String(3), default="GHS", nullable=False)
    
    # Reference for idempotency tracking of the contribution explicitly
    reference: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)

    goal: Mapped["Goal"] = relationship("Goal", back_populates="contributions")
    transaction: Mapped["Transaction"] = relationship("Transaction")

