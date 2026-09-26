import re

with open('frontend/components/GoalEditModal.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('target_amount: Math.round(parseFloat(targetStr) * 100),', '')

new_div = '''<div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5 flex items-center justify-between">
                <span>Target Amount (GHS)</span>
                <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">Fixed</span>
              </label>
              <input 
                type="number" 
                value={targetStr} 
                disabled={true}
                className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed" 
              />
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> The target cannot be changed after a goal is created.
              </p>
            </div>'''

c = re.sub(
    r'<div>\s*<label className="block text-sm font-semibold text-slate-900 mb-1\.5">Target Amount[^<]*</label>[\s\S]*?</div>',
    new_div,
    c
)

with open('frontend/components/GoalEditModal.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
