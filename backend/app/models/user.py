from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.account import Account
    from app.models.category import Category
    from app.models.goal import Goal
    from app.models.transaction import Transaction
    from app.models.provider_identity import ProviderIdentity

class User(BaseModel):
    __tablename__ = "users"
    
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    handle: Mapped[str | None] = mapped_column(String(30), unique=True, index=True, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="GHS", nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), default="UTC", nullable=False)

    accounts: Mapped[list["Account"]] = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories: Mapped[list["Category"]] = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    goals: Mapped[list["Goal"]] = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    provider_identities: Mapped[list["ProviderIdentity"]] = relationship("ProviderIdentity", back_populates="user", cascade="all, delete-orphan")

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}"
