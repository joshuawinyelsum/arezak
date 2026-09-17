import uuid
from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import typing

if typing.TYPE_CHECKING:
    from app.models.debt import Debt
    from app.models.transaction import Transaction

class DebtPayment(BaseModel):
    __tablename__ = "debt_payments"
    
    debt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("debts.id"), nullable=False, index=True)
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False, unique=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False) # pesewas

    debt: Mapped["Debt"] = relationship("Debt")
    transaction: Mapped["Transaction"] = relationship("Transaction")

