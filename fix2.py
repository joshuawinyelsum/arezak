with open('backend/tests/test_goals.py', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'process_income(db_session, test_user.id, test_account.id, 500000' in line:
        lines[i] = '    process_income(db_session, test_user.id, test_account.id, 500000, "GHS", "init_edit")\n'
with open('backend/tests/test_goals.py', 'w') as f:
    f.writelines(lines)
