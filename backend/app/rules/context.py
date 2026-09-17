from dataclasses import dataclass
from sqlalchemy.orm import Session
import uuid
from typing import Optional

from app.models.account import Account

@dataclass
class EvaluationContext:
    db: Session
    user_id: uuid.UUID
    operation_type: str # e.g. "SPEND", "WITHDRAW", "GOAL_CONTRIBUTION", "GOAL_RELEASE"
    amount_pesewas: int
    currency: str
    account_id: uuid.UUID
    
    # Optional goal_id for goal operations
    goal_id: Optional[uuid.UUID] = None
    
    # State loaded during evaluation pipeline
    account: Optional[Account] = None
    goal: Optional['Goal'] = None # Need to import or string ref

