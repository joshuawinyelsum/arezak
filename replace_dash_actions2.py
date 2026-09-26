import os

p = 'frontend/app/(app)/page.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

old_actions = '''          {/* Quick Actions */}
          <div className="grid grid-cols-4 md:flex md:flex-row gap-3 md:gap-4 md:bg-white md:p-3 md:rounded-2xl md:border md:border-slate-200 shadow-sm md:shadow-none">
             {[
                { href: "/transactions", icon: Download, label: "Add Income", sub: "Deposit money", color: "text-brand", bg: "bg-brand/10" },
                { href: "/goals/create", icon: Target, label: "Create Goal", sub: "Save for something", color: "text-brand", bg: "bg-brand/10" },
                { href: "/rules", icon: ShieldCheck, label: "Add Rule", sub: "Automate money", color: "text-brand", bg: "bg-brand/10" },
                { href: "/accounts", icon: ArrowRightLeft, label: "Transfer", sub: "Move between accounts", color: "text-brand", bg: "bg-brand/10" },
             ].map((action, idx) => (
                <Link href={action.href} key={idx} className="flex flex-col md:flex-row items-center md:items-start md:flex-1 gap-2 md:gap-4 p-2 md:p-3 md:hover:bg-slate-50 rounded-xl transition-colors group">
                   <div className={cn("w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", action.bg, action.color)}>
                      <action.icon className="w-5 h-5 md:w-4 md:h-4" />
                   </div>
                   <div className="text-center md:text-left">
                      <div className="text-xs md:text-sm font-semibold text-slate-900">{action.label}</div>
                      <div className="hidden md:block text-[11px] text-slate-500 mt-0.5">{action.sub}</div>
                   </div>
                </Link>
             ))}
          </div>'''

new_actions = '''          {/* Primary Action */}
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

c = c.replace(old_actions, new_actions)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
