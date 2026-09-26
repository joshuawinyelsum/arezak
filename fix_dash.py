with open('frontend/app/(app)/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

calc_block = '''  let totalAvailable = 0;
  let totalReserved = 0;
  let totalLocked = 0;
  let totalSum = 0;

  data.accounts.forEach(acc => {
    totalAvailable += acc.available_balance.amount_pesewas;
    totalReserved += acc.reserved_balance.amount_pesewas;
    totalLocked += acc.locked_balance.amount_pesewas;
    totalSum += acc.total_balance.amount_pesewas;
  });'''

new_calc = '''  let totalAvailable = 0;
  let totalProtected = 0;
  let totalBalance = 0;

  data.accounts.forEach(acc => {
    totalAvailable += acc.available_balance.amount_pesewas;
    totalProtected += acc.reserved_balance.amount_pesewas + acc.locked_balance.amount_pesewas;
    totalBalance += acc.total_balance.amount_pesewas;
  });'''

c = c.replace(calc_block, new_calc)

import re
c = re.sub(r'const availPct = getPercentage\(totalAvailable\);[\s\S]*?const goalPct = getPercentage\(totalLocked\);', 
'''const availPct = getPercentage(totalAvailable);
  const protPct = getPercentage(totalProtected);''', c)

c = c.replace('if (totalSum === 0) return 0;', 'if (totalBalance === 0) return 0;')
c = c.replace('return Math.round((value / totalSum) * 100);', 'return Math.round((value / totalBalance) * 100);')

with open('frontend/app/(app)/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
