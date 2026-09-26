import re

p = 'backend/app/api/v1/goals.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Delete api_release_goal completely
c = re.sub(r'@router\.post\("/\{goal_id\}/release"\)\ndef api_release_goal\(.*?\n\s+return \{.*?\}', '', c, flags=re.DOTALL)

# Delete api_cancel_goal completely
c = re.sub(r'@router\.post\(\'\/\{goal_id\}\/cancel\'\)\ndef api_cancel_goal\(.*?\n\s+return \{.*?\}', '', c, flags=re.DOTALL)

# Let's just remove anything that matches "@router.post...release" up to the next "@router" or end of file
lines = c.split('\n')
new_lines = []
skip = False
for line in lines:
    if line.startswith('@router.post("/{goal_id}/release")') or line.startswith("@router.post('/{goal_id}/cancel')"):
        skip = True
    elif line.startswith('@router') and skip:
        skip = False
    
    if not skip:
        new_lines.append(line)

c = '\n'.join(new_lines)

# Also remove references in archive
c = c.replace('if goal.status not in ["RELEASED", "CANCELLED"]:', 'if goal.status != "ACHIEVED":')
c = c.replace('raise HTTPException(status_code=400, detail="Only released or cancelled goals can be archived.")', 'raise HTTPException(status_code=400, detail="Only achieved goals can be archived.")')

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
