import os
p = 'app/(app)/page.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Remove totalLocked computation
c = c.replace('let totalLocked = 0;', '')
c = c.replace('totalLocked += acc.locked_balance.amount_pesewas;', '')
c = c.replace('const goalPct = getPercentage(totalLocked);', '')

# 2. Update grid
old_grid = '''             <div className="grid grid-cols-3 gap-4">
                <div className="bg-brand text-white p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Wallet className="w-4 h-4"/></div>
                   <div>
                     <div className="text-xs text-white/80 font-medium mb-1">Available Balance</div>
                     <div className="text-xl font-bold">{formatMoney(totalAvailable)}</div>
                     <div className="text-[10px] text-white/60 mt-2"> {availPct}% of total</div>
                   </div>
                </div>
                <div className="bg-[#E6F8F0] border border-[#BDE8D6] text-[#0A5436] p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-[#CCEFDF] flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-[#127951]"/></div>
                   <div>
                     <div className="text-xs font-medium mb-1 opacity-80">Protected</div>
                     <div className="text-xl font-bold text-[#0D6A45]">{formatMoney(totalProtected)}</div>
                     <div className="text-[10px] opacity-70 mt-2"> {protPct}% of total</div>
                   </div>
                </div>
                <div className="bg-[#FFF4ED] border border-[#FFD9C2] text-[#80380A] p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-[#FFE1CD] flex items-center justify-center"><Target className="w-4 h-4 text-[#B35212]"/></div>
                   <div>
                     <div className="text-xs font-medium mb-1 opacity-80">Goals (Locked)</div>
                     <div className="text-xl font-bold text-[#A64A0F]">{formatMoney(totalLocked)}</div>
                     <div className="text-[10px] opacity-70 mt-2"> {goalPct}% of total</div>
                   </div>
                </div>
             </div>'''

new_grid = '''             <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand text-white p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Wallet className="w-4 h-4"/></div>
                   <div>
                     <div className="text-xs text-white/80 font-medium mb-1">Available Balance</div>
                     <div className="text-xl font-bold">{formatMoney(totalAvailable)}</div>
                     <div className="text-[10px] text-white/60 mt-2"> {availPct}% of total</div>
                   </div>
                </div>
                <div className="bg-[#E6F8F0] border border-[#BDE8D6] text-[#0A5436] p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-[#CCEFDF] flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-[#127951]"/></div>
                   <div>
                     <div className="text-xs font-medium mb-1 opacity-80">Protected</div>
                     <div className="text-xl font-bold text-[#0D6A45]">{formatMoney(totalProtected)}</div>
                     <div className="text-[10px] opacity-70 mt-2"> {protPct}% of total</div>
                   </div>
                </div>
             </div>'''

c = c.replace(old_grid, new_grid)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
