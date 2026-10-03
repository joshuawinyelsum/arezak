from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class PhoneVerificationAttempt(BaseModel):
    __tablename__ = "phone_verification_attempts"

    phone_number: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    otp_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    provider_managed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
