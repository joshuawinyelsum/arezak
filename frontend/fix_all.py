import os
import re

# 1. Fix goals/page.tsx
p1 = 'app/(app)/goals/page.tsx'
with open(p1, 'r', encoding='utf-8') as f:
    c1 = f.read()
c1 = re.sub(r'apiFetch\(/goals/\$\{selectedGoal\.id\}/contributions,', r'apiFetch(/goals//contributions,', c1)
c1 = re.sub(r'apiFetch\(/goals/\$\{selectedGoal\.id\}\$\{actionUrl\},', r'apiFetch(/goals/,', c1)
with open(p1, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c1)

# 2. Fix goals/[id]/page.tsx
p2 = 'app/(app)/goals/[id]/page.tsx'
with open(p2, 'r', encoding='utf-8') as f:
    c2 = f.read()
c2 = re.sub(r'apiFetch\(/goals/\$\{goalId\}\),', r'apiFetch(/goals/),', c2)
c2 = re.sub(r'apiFetch\(/goals/\$\{goal\.id\}/contributions,', r'apiFetch(/goals//contributions,', c2)
c2 = re.sub(r'apiFetch\(/goals/\$\{goal\.id\}\$\{actionUrl\},', r'apiFetch(/goals/,', c2)
c2 = re.sub(r'apiFetch\(/goals/\),', r'apiFetch(/goals/),', c2)
c2 = re.sub(r'apiFetch\(/goals//contributions,', r'apiFetch(/goals//contributions,', c2)
c2 = re.sub(r'apiFetch\(/goals/,', r'apiFetch(/goals/,', c2)

with open(p2, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c2)

# 3. Fix page.tsx
p3 = 'app/(app)/page.tsx'
with open(p3, 'r', encoding='utf-8') as f:
    c3 = f.read()
c3 = re.sub(r'GH\? ', r'GH₵ ', c3)
c3 = re.sub(r'GH\?', r'GH₵', c3)
c3 = re.sub(r'Good morning, \{firstName\} \?\?', r'Good morning, {firstName} 👋', c3)
with open(p3, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c3)

