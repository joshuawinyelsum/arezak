import os
import re

p = 'backend/app/services/goal_service.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# I will use string splitting or regex to remove def cancel_goal( and def release_goal(.
# They should be at the bottom of the file usually. Let's just remove them.
# cancel_goal
c = re.sub(r'def cancel_goal\(.*?return transaction\n', '', c, flags=re.DOTALL)
# release_goal
c = re.sub(r'def release_goal\(.*?return transaction\n', '', c, flags=re.DOTALL)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
