from typing import List

from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision
from app.rules.constraints.base import BaseConstraint
from app.rules.constraints.amount_constraint import ValidAmountConstraint
from app.rules.constraints.account_access_constraint import AccountAccessConstraint
from app.rules.constraints.goal_access_constraint import GoalAccessConstraint
from app.rules.constraints.goal_release_constraint import GoalReleaseConstraint
from app.rules.constraints.goal_cancellation_constraint import GoalCancellationConstraint
from app.rules.constraints.correction_constraint import CorrectionConstraint
from app.rules.constraints.balance import BalanceConstraint

class ConstraintEngine:
    def __init__(self):
        # The explicit, deterministic pipeline order
        self.pipeline: List[BaseConstraint] = [
            ValidAmountConstraint(),
            AccountAccessConstraint(),
            GoalAccessConstraint(),
            GoalReleaseConstraint(),
            GoalCancellationConstraint(),
            CorrectionConstraint(),
            BalanceConstraint()
        ]
        
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        for constraint in self.pipeline:
            decision = constraint.evaluate(context)
            if not decision.allowed:
                # Short-circuit first-failure semantics
                return decision
                
        return ConstraintDecision.allow()

# Singleton instance
engine = ConstraintEngine()

