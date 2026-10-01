import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.user import User

class ProviderIdentity(BaseModel):
    __tablename__ = "provider_identities"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. 'google', 'apple'
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    user: Mapped["User"] = relationship("User", back_populates="provider_identities")
