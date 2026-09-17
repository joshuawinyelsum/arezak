
from app.rules.constraints.base import BaseConstraint
from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision
from app.rules.codes import DecisionCode

class CorrectionConstraint(BaseConstraint):
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        if context.operation_type != "TRANSACTION_CORRECTION":
            return ConstraintDecision.allow()
            
        # For a correction, the amount_pesewas is the net debit to the account.
        # If net debit > available_balance, it fails.
        if context.amount_pesewas > context.account.available_balance:
            return ConstraintDecision.deny(
                code=DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS,
                message=f"Correction would exceed your available balance by {(context.amount_pesewas - context.account.available_balance) / 100:.2f} {context.currency}."
            )
        return ConstraintDecision.allow()

