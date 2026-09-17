from abc import ABC, abstractmethod
from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision

class BaseConstraint(ABC):
    @abstractmethod
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        """Evaluates the context and returns a ConstraintDecision."""
        pass

