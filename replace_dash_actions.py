import os
import re

p = 'frontend/app/(app)/page.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the Quick Actions block
pattern = r'\{\/\* Quick Actions \*\/\}.*?\}\)\)\}\n\s*<\/div>'

replacement = '''{/* Primary Action */}
          <div className="flex flex-col gap-3">
             <button 
                onClick={() => setIsMoveMoneyOpen(true)}
                className="w-full bg-brand text-white p-4 rounded-2xl flex items-center justify-between hover:bg-brand-hover transition-colors shadow-sm group"
             >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <ArrowUpRight className="w-6 h-6" />
                   </div>
                   <div className="text-left">
                      <div className="font-bold text-lg">Move Money</div>
                      <div className="text-sm text-white/80">Send, pay, or transfer to wallet/bank</div>
                   </div>
                </div>
             </button>
          </div>'''

c = re.sub(pattern, replacement, c, flags=re.DOTALL)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
