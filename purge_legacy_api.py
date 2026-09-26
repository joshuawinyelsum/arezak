import os
import re

p = 'backend/app/api/v1/goals.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove release_goal API
c = re.sub(r'@router\.post\("/\{goal_id\}/release".*?return TransactionResponse\.from_orm_transaction\(tx\)', '', c, flags=re.DOTALL)

# Remove cancel_goal API
c = re.sub(r'@router\.post\("/\{goal_id\}/cancel".*?return TransactionResponse\.from_orm_transaction\(tx\)', '', c, flags=re.DOTALL)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
