with open('app/(app)/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

import re
c = re.sub(r'Good morning, \{firstName\} \?\?', 'Good morning, {firstName} 👋', c)

with open('app/(app)/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
