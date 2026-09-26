import os
import re

p = 'frontend/app/(app)/page.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# I will replace onSuccess={loadDashboardData} with onSuccess={() => window.location.reload()} as a simple, guaranteed refresh.
c = c.replace('onSuccess={loadDashboardData}', 'onSuccess={() => window.location.reload()}')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
