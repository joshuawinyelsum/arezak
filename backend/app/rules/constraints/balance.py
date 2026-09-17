from app.rules.constraints.base import BaseConstraint
from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision
from app.rules.codes import DecisionCode

class BalanceConstraint(BaseConstraint):
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        if context.operation_type not in ["SPEND", "WITHDRAW", "TRANSFER_OUT", "GOAL_CONTRIBUTION"]:
            return ConstraintDecision.allow()
            
        account = context.account
        total_balance = account.available_balance + account.reserved_balance + account.locked_balance
        
        # Invariant 4 & 6: Cannot spend more than available_balance
        if context.amount_pesewas > account.available_balance:
            # Determine WHY it failed for structured decision
            if context.amount_pesewas <= total_balance:
                # User has the total money, but some is protected/locked
                return ConstraintDecision.deny(
                    code=DecisionCode.FUNDS_LOCKED,
                    message=f"Operation requires {context.amount_pesewas / 100:.2f} {context.currency}, but only {account.available_balance / 100:.2f} is available because funds are locked."
                )
            else:
                # User literally doesn't have enough money across all states
                return ConstraintDecision.deny(
                    code=DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS,
                    message=f"Insufficient funds. Required: {context.amount_pesewas / 100:.2f} {context.currency}, Available: {account.available_balance / 100:.2f} {context.currency}."
                )
        
        # Invariant 2: available_balance >= 0 (Checked implicitly by the above, but let's be explicit)
        if account.available_balance - context.amount_pesewas < 0:
            return ConstraintDecision.deny(
                code=DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS,
                message="Operation would result in a negative available balance."
            )
            
        return ConstraintDecision.allow()

