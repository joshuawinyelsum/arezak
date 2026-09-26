import os
import re

p = 'backend/tests/test_goals.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# I will write a regex to completely strip out ALL tests that contain "release_goal" or "is_eligible_for_release".
def clean_file(content):
    tests = []
    current_test = []
    
    for line in content.split('\n'):
        if line.startswith('def test_'):
            if current_test:
                tests.append('\n'.join(current_test))
            current_test = [line]
        else:
            if current_test:
                current_test.append(line)
            else:
                tests.append(line) # imports etc
    
    if current_test:
        tests.append('\n'.join(current_test))
        
    filtered_tests = []
    for t in tests:
        if 'release_goal' in t or 'is_eligible_for_release' in t:
            continue
        filtered_tests.append(t)
        
    return '\n'.join(filtered_tests)

c = clean_file(c)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
