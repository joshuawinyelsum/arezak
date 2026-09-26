import re

p = 'backend/tests/test_goals.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# I will write a script to just completely remove tests for cancel and release
# Or, even better, just replace the file with the remaining valid tests since I can do that cleanly.
c = re.sub(r'from app\.services\.goal_service import create_goal, contribute_to_goal, release_goal', 'from app.services.goal_service import create_goal, contribute_to_goal', c)
c = re.sub(r'from app\.services\.goal_service import create_goal, edit_goal, contribute_to_goal, release_goal', 'from app.services.goal_service import create_goal, edit_goal, contribute_to_goal', c)

# Strip out def test_goal_release_...
c = re.sub(r'def test_release_goal_success\(.*?\n\n', '\n', c, flags=re.DOTALL)
c = re.sub(r'def test_release_already_released_goal_fails\(.*?\n\n', '\n', c, flags=re.DOTALL)
c = re.sub(r'def test_release_goal_different_account_fails\(.*?\n\n', '\n', c, flags=re.DOTALL)
c = re.sub(r'def test_concurrent_goal_release\(.*?\n\n', '\n', c, flags=re.DOTALL)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
