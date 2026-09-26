import os

p3 = 'app/(app)/page.tsx'
with open(p3, 'r', encoding='utf-8') as f:
    c3 = f.read()

# 1. Math fixes
c3 = c3.replace('let totalReserved = 0;', 'let totalProtected = 0;')
c3 = c3.replace('totalReserved += acc.reserved_balance.amount_pesewas;', 'totalProtected += acc.reserved_balance.amount_pesewas + acc.locked_balance.amount_pesewas;')
c3 = c3.replace('const availPct = getPercentage(totalAvailable);', 'const availPct = getPercentage(totalAvailable);\n  const protPct = getPercentage(totalProtected);')

# 2. Text replacements
c3 = c3.replace('<span className="text-sm font-medium text-white/80">Total Available Balance</span>', '<span className="text-sm font-medium text-white/80">Total balance</span>')

# 3. Replace the breakdown block safely
old_breakdown = '''<div className="flex justify-between items-end mt-2">
                         <div>
                            <div className="text-[11px] font-medium text-white/60 mb-1 uppercase tracking-wider">Available</div>
                            <div className="text-lg font-semibold">{formatMoney(totalBalance)}</div>
                         </div>
                         <div className="text-right">
                            <div className="text-[11px] font-medium text-white/60 mb-1 uppercase tracking-wider">Reserved</div>
                            <div className="text-lg font-semibold">{formatMoney(totalReserved)}</div>
                         </div>
                       </div>'''
new_breakdown = '''<div className="flex justify-between items-end mt-2">
                         <div>
                            <div className="text-[11px] font-medium text-white/60 mb-1 uppercase tracking-wider">Available</div>
                            <div className="text-lg font-semibold">{formatMoney(totalAvailable)}</div>
                         </div>
                         <div className="text-right">
                            <div className="text-[11px] font-medium text-white/60 mb-1 uppercase tracking-wider">Protected</div>
                            <div className="text-lg font-semibold">{formatMoney(totalProtected)}</div>
                         </div>
                       </div>'''
c3 = c3.replace(old_breakdown, new_breakdown)

# 4. Remove Money flow entirely or fix it (it expects goalPct)
# Let's just fix it to use protPct instead of crashing on missing goalPct
old_money_flow = '''<div className="flex-1 flex items-center gap-6">
                   <div className="relative w-28 h-28 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                         {totalSum > 0 ? (
                           <>
                             {/* Available */}
                             <path className="text-blue-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${availPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                             {/* Protected */}
                             <path className="text-green-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${protPct}, 100`} strokeDashoffset={`-${availPct}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                             {/* Goals */}
                             <path className="text-orange-400" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${goalPct}, 100`} strokeDashoffset={`-${availPct + protPct}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                           </>'''

new_money_flow = '''<div className="flex-1 flex items-center gap-6">
                   <div className="relative w-28 h-28 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                         {totalSum > 0 ? (
                           <>
                             {/* Available */}
                             <path className="text-blue-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${availPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                             {/* Protected */}
                             <path className="text-green-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${protPct}, 100`} strokeDashoffset={`-${availPct}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                           </>'''
c3 = c3.replace(old_money_flow, new_money_flow)

# Fix the breakdown text
old_bd_txt = '''<div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-slate-600 font-medium">Protected</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">{protPct}%</span> <span className="font-semibold text-slate-900">{formatMoney(totalReserved)}</span></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div><span className="text-slate-600 font-medium">Goals</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">{goalPct}%</span> <span className="font-semibold text-slate-900">{formatMoney(totalLocked)}</span></div>
                      </div>'''

new_bd_txt = '''<div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-slate-600 font-medium">Protected</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">{protPct}%</span> <span className="font-semibold text-slate-900">{formatMoney(totalProtected)}</span></div>
                      </div>'''
c3 = c3.replace(old_bd_txt, new_bd_txt)


old_mob_row = '''<div className="flex md:hidden items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><Wallet className="w-4 h-4"/></div>
                   <div className="text-center">
                      <div className="text-xs font-semibold text-slate-900">Available</div>
                      <div className="text-[10px] text-slate-500">{formatMoney(totalAvailable)}</div>
                   </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center"><ShieldCheck className="w-4 h-4"/></div>
                   <div className="text-center">
                      <div className="text-xs font-semibold text-slate-900">Protected</div>
                      <div className="text-[10px] text-slate-500">{formatMoney(totalReserved)}</div>
                   </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><Target className="w-4 h-4"/></div>
                   <div className="text-center">
                      <div className="text-xs font-semibold text-slate-900">Goals</div>
                      <div className="text-[10px] text-slate-500">{formatMoney(totalLocked)}</div>
                   </div>
                </div>
             </div>'''

new_mob_row = '''<div className="flex md:hidden items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm gap-2">
                  <div className="flex-1 flex flex-col items-center gap-2">
                     <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><Wallet className="w-4 h-4"/></div>
                     <div className="text-center">
                        <div className="text-xs font-semibold text-slate-900">Available</div>
                        <div className="text-[10px] text-slate-500">{formatMoney(totalAvailable)}</div>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 border-l border-slate-100">
                     <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center"><ShieldCheck className="w-4 h-4"/></div>
                     <div className="text-center">
                        <div className="text-xs font-semibold text-slate-900">Protected</div>
                        <div className="text-[10px] text-slate-500">{formatMoney(totalProtected)}</div>
                     </div>
                  </div>
               </div>'''
c3 = c3.replace(old_mob_row, new_mob_row)

c3 = c3.replace('No active goals found.', 'No goals yet.<br/><span className="mt-1 block">Create a goal to start protecting money for something that matters to you.</span>')

with open(p3, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c3)
