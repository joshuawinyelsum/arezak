import os

p2 = 'app/(app)/goals/[id]/page.tsx'
with open(p2, 'r', encoding='utf-8') as f:
    c2 = f.read()

c2 = c2.replace("You've reached your target.", "You&apos;ve reached your target.")

with open(p2, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c2)

