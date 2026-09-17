import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.user import User
    from app.models.goal_contribution import GoalContribution

class Goal(BaseModel):
    __tablename__ = "goals"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    target_amount: Mapped[int] = mapped_column(Integer, nullable=False) # pesewas
    current_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False) # pesewas (saved)
    locked_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False) # pesewas (protected)
    currency: Mapped[str] = mapped_column(String(3), default="GHS", nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False) # ACTIVE, ACHIEVED, CANCELLED
    
    lock_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lock_type: Mapped[str | None] = mapped_column(String(50), nullable=True) # TARGET_REACHED, DATE_REACHED, BOTH
    
    unlock_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="goals")
    contributions: Mapped[list["GoalContribution"]] = relationship("GoalContribution", back_populates="goal", cascade="all, delete-orphan")

