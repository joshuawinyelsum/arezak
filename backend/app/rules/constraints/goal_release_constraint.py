from sqlalchemy.orm import Session
from sqlalchemy import select

from app.rules.constraints.base import BaseConstraint
from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision
from app.rules.codes import DecisionCode
from app.models.goal import Goal

class GoalReleaseConstraint(BaseConstraint):
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        if context.operation_type != "GOAL_RELEASE":
            return ConstraintDecision.allow()
            
        if not context.goal_id:
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_FOUND, "No goal specified.")

        # Lock the goal for update to prevent concurrent release
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
            
        from datetime import datetime, timezone
        
        if goal.status == "RELEASED":
            return ConstraintDecision.deny(DecisionCode.GOAL_ALREADY_RELEASED, "Goal has already been released.")
            
        # Determine if the goal is eligible for release based on its lock condition
        if not goal.is_eligible_for_release:
            return ConstraintDecision.deny(DecisionCode.GOAL_NOT_ACHIEVED, "Goal condition not met for release.")
            
        if goal.locked_amount <= 0:
            return ConstraintDecision.deny(DecisionCode.GOAL_LOCK_INTEGRITY_ERROR, "Goal has no locked funds to release.")

        # Check that the account's locked balance is sufficient (Integrity check)
        # Note: Account is locked by AccountAccessConstraint before this constraint
        if context.account and context.account.locked_balance < goal.locked_amount:
            return ConstraintDecision.deny(DecisionCode.GOAL_LOCK_INTEGRITY_ERROR, "Account locked balance is less than goal locked amount.")

        # Set the exact release amount derived from the database, protecting against client tampering
        context.amount_pesewas = goal.locked_amount
        context.goal = goal
        return ConstraintDecision.allow()

