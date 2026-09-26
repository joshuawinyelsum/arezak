import os
import re

p = 'frontend/components/GoalEditModal.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove targetStr state
c = c.replace('const [targetStr, setTargetStr] = useState("");\n', '')
c = c.replace('setTargetStr((goal.target_amount / 100).toString());', '')

# Remove targetStr from handleSubmit payload
c = re.sub(r'const targetFloat = parseFloat\(targetStr\);\n.*?target_amount: Math.round\(targetFloat \* 100\),', '', c, flags=re.DOTALL)
# The payload actually looks like this:
c = re.sub(r'const payload = {[^}]+};', 'const payload = { name, icon };', c)

# Remove the target amount input field
c = re.sub(r'<div>\s*<label className="block text-sm font-semibold text-slate-900 mb-1\.5">Target Amount \(GH\u20b5\)</label>\s*<input.*?/>\s*</div>', '', c, flags=re.DOTALL)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)

p2 = 'frontend/app/(app)/goals/create/page.tsx'
with open(p2, 'r', encoding='utf-8') as f:
    c2 = f.read()

# Fix the timezone issue: use the local date for the string, but when submitting, send it correctly.
# Wait, <input type="date"> returns "YYYY-MM-DD" string.
# To convert "YYYY-MM-DD" to ISO string in UTC without shifting back a day:
c2 = c2.replace('''unlock_date: (lockType === "DATE_REACHED" || lockType === "TARGET_AND_DATE") && unlockDate ? new Date(unlockDate).toISOString() : null,''', '''unlock_date: (lockType === "DATE_REACHED" || lockType === "TARGET_AND_DATE") && unlockDate ? new Date(unlockDate + "T12:00:00Z").toISOString() : null,''')

with open(p2, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c2)

