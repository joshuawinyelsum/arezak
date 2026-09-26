with open('frontend/app/(app)/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('No active goals found.', 'No goals yet.<br/><span className="mt-1 block">Create a goal to start protecting money for something that matters to you.</span>')

with open('frontend/app/(app)/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
