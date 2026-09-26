with open('frontend/app/(app)/accounts/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('Protected Funds', 'Protected')
c = c.replace('Saved for obligations', 'Money set aside')
c = c.replace('Locked towards targets', 'Set aside in goals')
c = c.replace('Your total financial state is rigorously divided. You cannot spend protected funds or locked goals. The system will enforce this automatically at the transaction level.', 'Your financial state is rigorously divided. You cannot spend protected funds. The system will enforce this automatically at the transaction level.')

with open('frontend/app/(app)/accounts/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
