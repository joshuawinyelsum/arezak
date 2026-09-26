import re

with open('frontend/app/(app)/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

new_block = '''            {/* Top Row: Balance & Money Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
               {/* Total Balance Card */}
               <div className="rounded-[24px] bg-gradient-to-br from-brand to-[#1a37a5] text-white p-6 relative overflow-hidden shadow-lg shadow-brand/20">
                 <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                   <div>
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-medium text-white/80">Total balance</span>
                       <button onClick={() => setShowBalance(!showBalance)} className="text-white/60 hover:text-white transition-colors">
                         {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                       </button>
                     </div>
                     <div className="text-[32px] font-bold tracking-tight mb-2">
                       {formatMoney(totalBalance)}
                     </div>
                   </div>
                 </div>
                 
                 <div className="absolute -bottom-16 -right-16 opacity-20 pointer-events-none mix-blend-overlay">
                    <div className="w-64 h-64 border-[40px] border-white rounded-full"></div>
                 </div>
               </div>
  
               {/* Your Money Flow (Desktop only, mobile shows small icons) */}
               <div className="hidden md:flex flex-col bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-semibold text-slate-900">Your Money Flow</h3>
                  </div>
                  <div className="flex-1 flex items-center gap-6">
                     <div className="relative w-28 h-28 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                           {totalBalance > 0 ? (
                             <>
                               {/* Available */}
                               <path className="text-blue-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={${availPct}, 100} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                               {/* Protected */}
                               <path className="text-green-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={${protPct}, 100} strokeDashoffset={-} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                             </>
                           ) : (
                             <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                           )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-[10px] text-slate-500 font-medium leading-none mb-1">Total balance</span>
                           <span className="font-bold text-slate-900 text-sm">{formatMoney(totalBalance)}</span>
                        </div>
                     </div>
                     <div className="flex-1 flex flex-col gap-4 justify-center">
                        <div className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-slate-600 font-medium">Available</span></div>
                           <div className="flex items-center gap-2"><span className="text-slate-400">{availPct}%</span> <span className="font-semibold text-slate-900">{formatMoney(totalAvailable)}</span></div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-slate-600 font-medium">Protected</span></div>
                           <div className="flex items-center gap-2"><span className="text-slate-400">{protPct}%</span> <span className="font-semibold text-slate-900">{formatMoney(totalProtected)}</span></div>
                        </div>
                     </div>
                  </div>
               </div>
  
               {/* Mobile-only Stats Row */}
               <div className="flex md:hidden items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm gap-2">
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
               </div>
            </div>'''

c = re.sub(r'\{\/\* Top Row: Balance & Money Flow \*\/\}.*?\{\/\* Quick Actions \*\/\}', new_block + '\n\n            {/* Quick Actions */}', c, flags=re.DOTALL)

with open('frontend/app/(app)/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
