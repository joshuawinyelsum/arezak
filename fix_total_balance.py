import os
import re

p = 'backend/app/services/transaction_service.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix the total_balance assignment crash
c = c.replace('account.total_balance -= amount_pesewas', '')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
