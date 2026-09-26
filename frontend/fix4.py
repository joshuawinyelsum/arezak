import os
p = 'app/(app)/page.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('totalReserved', 'totalProtected')
c = c.replace('Protected Funds', 'Protected')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
