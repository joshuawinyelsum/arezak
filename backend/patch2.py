import os
import re

p = 'tests/test_goals.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the whole test_goal_edit_target_amount
old_test1 = '''def test_goal_edit_target_amount(db_session: Session, test_user):
    from app.services.goal_service import create_goal, edit_goal
    import uuid
    goal = create_goal(
        db=db_session,
        user_id=test_user.id,
        name="Edit Test Goal",
        target_amount=450000,
        currency="GHS",
        lock_type="TARGET_REACHED"
    )
    db_session.commit()
    assert goal.target_amount == 450000

    # Try passing target_amount in python to simulate bypassing API
    with pytest.raises(TypeError):
        edit_goal(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=300000
        )

    # 3000 -> 6000
    goal = edit_goal(
        db=db_session,
        user_id=test_user.id,
        goal_id=goal.id,
        target_amount=600000
    )
    db_session.commit()
    assert goal.target_amount == 600000'''

new_test1 = '''def test_goal_edit_target_amount(db_session: Session, test_user):
    from app.services.goal_service import create_goal, edit_goal
    import pytest
    import uuid
    goal = create_goal(
        db=db_session,
        user_id=test_user.id,
        name="Edit Test Goal",
        target_amount=450000,
        currency="GHS",
        lock_type="TARGET_REACHED"
    )
    db_session.commit()
    assert goal.target_amount == 450000

    # Try passing target_amount in python to simulate bypassing API
    with pytest.raises(TypeError):
        edit_goal(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=300000
        )'''
c = c.replace(old_test1, new_test1)

# Replace test_goal_edit_target_amount_with_funding
old_test2 = '''def test_goal_edit_target_amount_with_funding(db_session: Session, test_user, test_account):
    from app.services.transaction_service import process_income
    process_income(db_session, test_user.id, test_account.id, 500000, "GHS", "init")
    db_session.commit()
    from app.services.goal_service import create_goal, edit_goal, contribute_to_goal
    import pytest
    goal = create_goal(
        db=db_session,
        user_id=test_user.id,
        name="Funded Edit Goal",
        target_amount=450000,
        currency="GHS",
        lock_type="TARGET_REACHED"
    )
    db_session.commit()

    # Add 4000
    contribute_to_goal(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        goal_id=goal.id,
        amount_pesewas=400000
    )
    db_session.commit()

    # 4500 -> 6000 (Allowed)
    goal = edit_goal(
        db=db_session,
        user_id=test_user.id,
        goal_id=goal.id,
        target_amount=600000
    )
    db_session.commit()
    assert goal.target_amount == 600000'''

new_test2 = '''def test_goal_edit_target_amount_with_funding(db_session: Session, test_user, test_account):
    from app.services.transaction_service import process_income
    process_income(db_session, test_user.id, test_account.id, 500000, "GHS", "init")
    db_session.commit()
    from app.services.goal_service import create_goal, edit_goal, contribute_to_goal
    import pytest
    goal = create_goal(
        db=db_session,
        user_id=test_user.id,
        name="Funded Edit Goal",
        target_amount=450000,
        currency="GHS",
        lock_type="TARGET_REACHED"
    )
    db_session.commit()

    contribute_to_goal(
        db=db_session,
        user_id=test_user.id,
        account_id=test_account.id,
        goal_id=goal.id,
        amount_pesewas=400000
    )
    db_session.commit()

    with pytest.raises(TypeError):
        edit_goal(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=600000
        )'''
c = c.replace(old_test2, new_test2)

# Replace test_full_goal_lifecycle
c = re.sub(r'''    # 2. Edit 4500 -> 3000
    goal = edit_goal\(db_session, test_user.id, goal.id, target_amount=300000\)
    db_session.commit\(\)
    assert goal.target_amount == 300000''', '''    # 2. Rename
    goal = edit_goal(db_session, test_user.id, goal.id, name="Renamed")
    db_session.commit()''', c)


with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
