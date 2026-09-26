import os
import re

p = 'app/(app)/page.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace totalLocked usages safely
c = re.sub(r'<div className="bg-\[#FFF4ED\].*?\{formatMoney\(totalLocked\)\}.*?</div>\s*</div>\s*</div>', '', c, flags=re.DOTALL)
c = c.replace('grid-cols-3', 'grid-cols-2')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
