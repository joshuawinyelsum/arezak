import re

with open('app/services/goal_service.py', 'r') as f:
    content = f.read()

# Replace the dangling code block between the first 'return transaction' and 'def release_goal'
fixed_content = re.sub(r'    return transaction\n    db\.add\(transaction\).*?    return transaction\n', r'    return transaction\n\n', content, flags=re.DOTALL)

with open('app/services/goal_service.py', 'w') as f:
    f.write(fixed_content)
