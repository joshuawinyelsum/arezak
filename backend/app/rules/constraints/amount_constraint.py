from app.rules.constraints.base import BaseConstraint
from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision
from app.rules.codes import DecisionCode

class ValidAmountConstraint(BaseConstraint):
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        if context.operation_type == "GOAL_RELEASE":
            return ConstraintDecision.allow()
            
        if context.amount_pesewas <= 0:
            return ConstraintDecision.deny(
                code=DecisionCode.INVALID_AMOUNT,
                message="Amount must be greater than zero."
            )
        return ConstraintDecision.allow()

