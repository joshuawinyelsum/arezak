import os

p = 'frontend/app/(app)/page.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('onSuccess={loadData}', 'onSuccess={loadDashboardData}')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
