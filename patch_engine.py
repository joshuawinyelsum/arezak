import os
import re

p = 'backend/app/rules/engine.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('from app.rules.constraints.goal_release_constraint import GoalReleaseConstraint\n', '')
c = c.replace('GoalReleaseConstraint(),', '')
c = c.replace('GoalReleaseConstraint()', '')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
