import os

p = 'backend/app/services/goal_service.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('Reach the target before deleting or releasing the funds.', 'Reach the target to move the funds.')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)

p2 = 'backend/tests/test_goals.py'
with open(p2, 'r', encoding='utf-8') as f:
    c2 = f.read()

c2 = c2.replace('match="Goal has financial history and cannot be deleted"', 'match="This goal cannot be deleted because it contains locked funds"')

with open(p2, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c2)
