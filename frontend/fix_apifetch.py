import os

p1 = 'app/(app)/goals/page.tsx'
with open(p1, 'r', encoding='utf-8') as f:
    c1 = f.read()
c1 = c1.replace('apiFetch(/goals//contributions, {', 'apiFetch(/goals//contributions, {')
c1 = c1.replace('apiFetch(/goals/, {', 'apiFetch(/goals/, {')
with open(p1, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c1)

p2 = 'app/(app)/goals/[id]/page.tsx'
with open(p2, 'r', encoding='utf-8') as f:
    c2 = f.read()
c2 = c2.replace('apiFetch(/goals/),', 'apiFetch(/goals/),')
c2 = c2.replace('apiFetch(/goals//contributions, {', 'apiFetch(/goals//contributions, {')
c2 = c2.replace('apiFetch(/goals/, {', 'apiFetch(/goals/, {')
with open(p2, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c2)

