import os
import re

p = 'frontend/components/MoveMoneyModal.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('apiFetch(/transactions/outbound, {', 'apiFetch(`/transactions/outbound`, {')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
