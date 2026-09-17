from sqlalchemy import select
from app.rules.constraints.base import BaseConstraint
from app.rules.context import EvaluationContext
from app.rules.decision import ConstraintDecision
from app.rules.codes import DecisionCode
from app.models.account import Account

class AccountAccessConstraint(BaseConstraint):
    def evaluate(self, context: EvaluationContext) -> ConstraintDecision:
        # Load authoritative state with row-level lock
        account = context.db.execute(
            select(Account)
            .where(Account.id == context.account_id, Account.user_id == context.user_id)
            .with_for_update()
        ).scalar_one_or_none()
        
        if not account:
            return ConstraintDecision.deny(
                code=DecisionCode.ACCOUNT_NOT_FOUND,
                message="Account not found or access denied."
            )
            
        context.account = account
        return ConstraintDecision.allow()

