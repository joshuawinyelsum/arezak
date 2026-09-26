import os
import re

p = 'tests/test_goals.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('contribute_to_goal(db=db_session, test_user.id, test_account.id, goal.id, 450000)', 'contribute_to_goal(db_session, test_user.id, test_account.id, goal.id, 450000)')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
