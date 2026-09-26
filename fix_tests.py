import re
with open('backend/tests/test_goals.py', 'r') as f:
    c = f.read()

bad_block = r'\s*from app\.services\.transaction_service import process_income\s*process_income\(db_session, test_user\.id, test_account\.id, 500000, "GHS", "init_edit"\)\s*db_session\.commit\(\)\s*db_session\.refresh\(test_account\)\s*'
c = re.sub(bad_block, '\n    ', c)

# And one inside concurrency test
bad_block_2 = r'\s*from app\.services\.transaction_service import process_income\s*process_income\(db_session, test_user\.id, test_account\.id, 500000, "GHS", "init_edit"\)\s*db_session\.commit\(\)\s*db_session\.refresh\(test_account\)\s*'
c = re.sub(bad_block_2, '\n    ', c)

with open('backend/tests/test_goals.py', 'w') as f:
    f.write(c)
