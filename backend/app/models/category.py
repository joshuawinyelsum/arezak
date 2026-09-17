import uuid
from sqlalchemy import String, ForeignKey, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.user import User
    from app.models.allocation_rule import AllocationRule

class Category(BaseModel):
    __tablename__ = "categories"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    available_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False) # in pesewas
    reserved_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="categories")
    allocation_rules: Mapped[list["AllocationRule"]] = relationship("AllocationRule", back_populates="category", cascade="all, delete-orphan")

