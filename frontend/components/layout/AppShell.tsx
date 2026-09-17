"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { 
  Home, 
  Wallet, 
  Target, 
  ShieldCheck, 
  ArrowRightLeft, 
  BarChart2, 
  Settings,
  Search,
  Bell,
  ChevronDown,
  Menu,
  Eye,
  EyeOff
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Rules", href: "/rules", icon: ShieldCheck },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { name: "Insights", href: "/insights", icon: BarChart2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const mobileNavItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Rules", href: "/rules", icon: ShieldCheck },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { name: "More", href: "/settings", icon: Menu },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] bg-white border-r border-slate-200 h-full flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <Image src="/brand/logo.png" alt="Arezak Logo" width={32} height={32} className="rounded-lg object-contain" />
          <span className="text-xl font-bold tracking-tight text-slate-900">AREZAK</span>
        </div>

        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search anything... ⌘K" 
              className="w-full bg-slate-100 text-sm rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm",
                  isActive 
                    ? "bg-brand/10 text-brand font-semibold" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-brand" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mx-3 mb-6 mt-auto">
          <div className="rounded-2xl bg-gradient-to-br from-[#1A2E7A] to-[#0D173D] p-5 text-white relative overflow-hidden group shadow-lg">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3 text-white">
                 <Image src="/brand/logo.png" alt="Arezak" width={20} height={20} className="opacity-80" />
              </div>
              <p className="text-sm font-semibold leading-snug">Discipline today,<br/>Freedom tomorrow.</p>
              <div className="mt-3 flex items-center justify-end">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors cursor-pointer">
                   <ArrowRightLeft className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Desktop Header */}
        <header className="hidden md:flex h-20 px-8 items-center justify-between border-b border-transparent">
           <div></div> {/* Spacer */}
           <div className="flex items-center gap-6">
              <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#f8fafc]"></span>
              </button>
              
              <div className="relative">
                 <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex items-center gap-3 hover:bg-slate-100 p-1.5 rounded-full pr-3 transition-colors focus:outline-none">
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                       <img src="https://i.pravatar.cc/150?u=joshua" alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col text-left">
                       <span className="text-sm font-semibold leading-none text-slate-900">Joshua Winyelsum</span>
                       <span className="text-xs text-slate-500 mt-1 leading-none">Student</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 ml-1 transition-transform", isMobileMenuOpen && "rotate-180")} />
                 </button>
                 
                 {isMobileMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                       <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Profile Settings</Link>
                       <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sign out</Link>
                    </div>
                 )}
              </div>
           </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex h-16 items-center justify-between px-5 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="Arezak Logo" width={28} height={28} className="rounded-md" />
            <span className="font-bold text-lg tracking-tight">AREZAK</span>
          </div>
          <button className="text-slate-500 p-2 -mr-2">
            <Search className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:px-8 md:py-2 pb-24 md:pb-8 relative">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 pt-2 pb-safe flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] h-[84px]">
           {mobileNavItems.map((item) => {
             const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
             return (
               <Link 
                 key={item.name} 
                 href={item.href}
                 className="flex flex-col items-center justify-center w-16 h-12"
               >
                 <div className={cn(
                   "flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-all", 
                   isActive ? "bg-brand/10 text-brand" : "text-slate-400"
                 )}>
                   <item.icon className={cn("w-5 h-5", isActive ? "text-brand" : "text-slate-400")} strokeWidth={isActive ? 2.5 : 2} />
                 </div>
                 <span className={cn("text-[10px] font-medium", isActive ? "text-brand" : "text-slate-500")}>
                   {item.name}
                 </span>
               </Link>
             );
           })}
        </nav>
      </div>
    </div>
  );
}
