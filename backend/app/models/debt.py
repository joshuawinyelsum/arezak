import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.user import User

class Debt(BaseModel):
    __tablename__ = "debts"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_amount: Mapped[int] = mapped_column(Integer, nullable=False) # pesewas
    remaining_amount: Mapped[int] = mapped_column(Integer, nullable=False) # pesewas
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship("User")

