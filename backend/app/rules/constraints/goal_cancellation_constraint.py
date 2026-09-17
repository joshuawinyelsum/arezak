from sqlalchemy.orm import Session
from sqlalchemy import select

from app.rules.constraints.base import BaseConstraint
from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision
from app.rules.codes import DecisionCode
from app.models.goal import Goal

class GoalCancellationConstraint(BaseConstraint):
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        if context.operation_type != "GOAL_CANCELLATION":
            return ConstraintDecision.allow()
            
        if not context.goal_id:
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_FOUND, "No goal specified.")

        goal = context.db.execute(
            select(Goal)
            .where(Goal.id == context.goal_id)
            .with_for_update()
        ).scalar_one_or_none()

        if not goal:
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_FOUND, "Goal not found.")
            
        if goal.user_id != context.user_id:
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_OWNED, "Goal does not belong to user.")
            
        if goal.status != "ACTIVE":
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_ACHIEVED, f"Goal cannot be cancelled because its status is {goal.status}.")
            
        if context.account and context.account.locked_balance < goal.locked_amount:
            return ConstraintDecision.deny(DecisionCode.GOAL_LOCK_INTEGRITY_ERROR, "Account locked balance is less than goal locked amount.")

        context.amount_pesewas = goal.locked_amount
        context.goal = goal
        return ConstraintDecision.allow()

