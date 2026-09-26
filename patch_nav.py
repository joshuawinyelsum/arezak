import os
import re

p = 'frontend/components/layout/AppShell.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace mobile bottom nav
old_nav = '''      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden flex items-center justify-around bg-white border-t border-slate-100 p-2 flex-shrink-0 z-50">
        {[
          { href: "/", icon: Home, label: "Home" },
          { href: "/goals", icon: Target, label: "Goals" },
          { href: "/rules", icon: ShieldCheck, label: "Rules" },
          { href: "/transactions", icon: ArrowRightLeft, label: "Transactions" },
          { href: "/settings", icon: Menu, label: "More" }
        ].map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-colors",
                isActive ? "text-brand" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>'''

new_nav = '''      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden flex items-center justify-around bg-white border-t border-slate-100 pb-safe pt-2 px-2 flex-shrink-0 z-50 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        {[
          { href: "/", icon: Home, label: "Home" },
          { href: "/goals", icon: Target, label: "Goals" },
          { href: "/rules", icon: ShieldCheck, label: "Rules" },
          { href: "/transactions", icon: ArrowRightLeft, label: "Transactions" },
          { href: "/settings", icon: Menu, label: "More" }
        ].map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl min-w-[64px] transition-colors",
                isActive ? "text-brand" : "text-slate-400 hover:text-slate-900 active:bg-slate-100"
              )}
            >
              <item.icon className={cn("w-6 h-6 mb-1", isActive && "stroke-[2.5px]")} />
              <span className={cn("text-[11px]", isActive ? "font-bold" : "font-medium")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>'''

c = c.replace(old_nav, new_nav)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)
