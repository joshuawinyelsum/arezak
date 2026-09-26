import os
import re

p = 'backend/app/models/goal.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('# ACTIVE, ACHIEVED, CANCELLED', '# ACTIVE, ACHIEVED')
c = c.replace('if self.status == "RELEASED" or self.status == "CANCELLED":', 'if self.status == "ACHIEVED":')
c = c.replace('return False # Released or cancelled goals cannot accept contributions', 'return False # Achieved goals cannot accept contributions')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
