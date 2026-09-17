from sqlalchemy.orm import Session
from sqlalchemy import select

from app.rules.constraints.base import BaseConstraint
from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision
from app.rules.codes import DecisionCode
from app.models.goal import Goal

class GoalAccessConstraint(BaseConstraint):
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        if context.operation_type != "GOAL_CONTRIBUTION":
            return ConstraintDecision.allow()
            
        if not context.goal_id:
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_FOUND, "No goal specified.")

        # Lock the goal for update to prevent concurrent overfunding
        goal = context.db.execute(
            select(Goal)
            .where(Goal.id == context.goal_id)
            .with_for_update()
        ).scalar_one_or_none()

        if not goal:
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_FOUND, "Goal not found.")
            
        if goal.user_id != context.user_id:
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_OWNED, "Goal does not belong to user.")
            
        if goal.currency != context.currency:
            return ConstraintDecision.deny(DecisionCode.CURRENCY_MISMATCH, "Goal currency mismatch.")
            
        if goal.status == "ACHIEVED":
            return ConstraintDecision.deny(DecisionCode.GOAL_ALREADY_ACHIEVED, "Goal is already achieved.")
            
        remaining = goal.target_amount - goal.current_amount
        if context.amount_pesewas > remaining:
            return ConstraintDecision.deny(DecisionCode.CONTRIBUTION_EXCEEDS_REMAINING_TARGET, "Contribution exceeds remaining target amount.")

        # Attach to context for mutation phase
        context.goal = goal
        return ConstraintDecision.allow()

