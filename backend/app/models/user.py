from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.account import Account
    from app.models.category import Category
    from app.models.goal import Goal
    from app.models.goal_category import GoalCategory
    from app.models.transaction import Transaction

class User(BaseModel):
    __tablename__ = "users"
    
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="GHS", nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), default="UTC", nullable=False)

    accounts: Mapped[list["Account"]] = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories: Mapped[list["Category"]] = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    goal_categories: Mapped[list["GoalCategory"]] = relationship("GoalCategory", back_populates="user", cascade="all, delete-orphan")
    goals: Mapped[list["Goal"]] = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")

