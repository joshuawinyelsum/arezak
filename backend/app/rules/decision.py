from pydantic import BaseModel
from typing import Optional
from app.rules.codes import DecisionCode

class ConstraintDecision(BaseModel):
    allowed: bool
    code: DecisionCode | str
    message: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    
    @classmethod
    def allow(cls) -> "ConstraintDecision":
        return cls(
            allowed=True,
            code=DecisionCode.ALLOWED,
            message="Operation is permitted."
        )
        
    @classmethod
    def deny(cls, code: DecisionCode | str, message: str, resource_type: str = None, resource_id: str = None) -> "ConstraintDecision":
        return cls(
            allowed=False,
            code=code,
            message=message,
            resource_type=resource_type,
            resource_id=resource_id
        )

class ConstraintViolationException(Exception):
    def __init__(self, decision: ConstraintDecision):
        self.decision = decision
        super().__init__(self.decision.message)

