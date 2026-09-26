import os

p = 'backend/tests/test_transactions.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('with pytest.raises(ValueError):', 'with pytest.raises(ConstraintViolationException):')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
