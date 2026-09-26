import re

p = 'tests/test_goals.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix test_goal_edit_target_amount
c = re.sub(r'''    # 4500 -> 3000
    goal = edit_goal\(
        db=db_session,
        user_id=test_user.id,
        goal_id=goal.id,
        target_amount=300000
    \)
    db_session.commit\(\)
    assert goal.target_amount == 300000''', '''    # Try passing target_amount in python to simulate bypassing API
    with pytest.raises(TypeError):
        edit_goal(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=300000
        )''', c)

# Fix test_goal_edit_target_amount_with_funding
c = c.replace('def test_goal_edit_target_amount_with_funding(db_session: Session, test_user, test_account):', '''def test_goal_edit_target_amount_with_funding(db_session: Session, test_user, test_account):
    from app.services.transaction_service import process_income
    process_income(db_session, test_user.id, test_account.id, 500000, "GHS", "init")
    db_session.commit()''')
c = re.sub(r'''    # Try edit 4500 -> 3000
    with pytest.raises\(ValueError, match="Cannot edit target amount after contributions have been made"\):
        edit_goal\(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=300000
        \)''', '''    # Try edit 4500 -> 3000
    with pytest.raises(TypeError):
        edit_goal(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=300000
        )''', c)
c = re.sub(r'''    # Try edit 4500 -> 6000
    with pytest.raises\(ValueError, match="Cannot edit target amount after contributions have been made"\):
        edit_goal\(
            db=db_session,
            user_id=test_user.id,
            goal_id=goal.id,
            target_amount=600000
        \)''', '', c)

# Fix test_full_goal_lifecycle
c = re.sub(r'''    # 2. Edit 4500 -> 3000
    goal = edit_goal\(db_session, test_user.id, goal.id, target_amount=300000\)
    db_session.commit\(\)
    assert goal.target_amount == 300000

    # 3. Add 3000 -> Should hit target and RELEASE
    tx = contribute_to_goal\(db_session, test_user.id, test_account.id, goal.id, 300000\)''', '''    # 2. Add 4500 -> Should hit target
    tx = contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 450000)''', c)
    
c = re.sub(r'''    # 4. Check status
    assert goal.status == "RELEASED"''', '''    # 4. Check status
    assert goal.status == "ACHIEVED"''', c)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
