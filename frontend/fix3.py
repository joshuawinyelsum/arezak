import os
p = 'app/(app)/page.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('''  const availPct = getPercentage(totalAvailable);
  const protPct = getPercentage(totalProtected);
  const protPct = getPercentage(totalReserved);
  const goalPct = getPercentage(totalLocked);''', '''  const availPct = getPercentage(totalAvailable);
  const protPct = getPercentage(totalProtected);''')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
