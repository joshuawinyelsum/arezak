import pytest
import uuid
from sqlalchemy.orm import Session
from app.services.goal_service import create_goal, contribute_to_goal, delete_goal
from app.services.transaction_service import process_income

def test_goal_with_zero_contribution_can_be_deleted(db_session: Session, test_user):
    goal = create_goal(db_session, test_user.id, 'Delete Me', 50000)
    delete_goal(db_session, test_user.id, goal.id)
    # verify
    from app.models.goal import Goal
    assert db_session.query(Goal).filter_by(id=goal.id).first() is None

def test_goal_with_contribution_cannot_be_deleted(db_session: Session, test_user, test_account):
    process_income(db_session, test_user.id, test_account.id, 50000, "GHS", "init_del")
    db_session.commit()
    
    goal = create_goal(db_session, test_user.id, 'Do Not Delete', 50000)
    contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 1000, "GHS", "contrib")
    
    with pytest.raises(ValueError, match="Goal has financial history and cannot be deleted"):
        delete_goal(db_session, test_user.id, goal.id)
