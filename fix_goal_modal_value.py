import os

p = 'frontend/components/GoalEditModal.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('value={targetStr}', 'value={goal ? (goal.target_amount / 100).toString() : ""}')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
