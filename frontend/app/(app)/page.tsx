"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowUpRight, 
  ArrowRightLeft, 
  Target, 
  ShieldCheck, 
  Wallet, 
  ChevronRight,
  Eye,
  EyeOff,
  Download,
  Wifi,
  Home as HomeIcon,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [showBalance, setShowBalance] = useState(true);
  
  const formatMoney = (amount: string) => showBalance ? `GH₵ ${amount}` : "GH₵ ••••••••";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      
      <div className="flex flex-col gap-1 md:mt-4">
         <h1 className="text-[22px] md:text-2xl font-bold text-slate-900 tracking-tight">Good morning, Joshua 👋</h1>
         <p className="text-sm text-slate-500">Your money is working according to your rules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
        
        {/* Left Column (Main Stats) */}
        <div className="md:col-span-8 flex flex-col gap-5 md:gap-6">
          
          {/* Top Row: Balance & Money Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
             {/* Total Available Balance Card */}
             <div className="rounded-[24px] bg-gradient-to-br from-brand to-[#1a37a5] text-white p-6 relative overflow-hidden shadow-lg shadow-brand/20">
               <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                 <div>
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-sm font-medium text-white/80">Total Available Balance ❖</span>
                     <button onClick={() => setShowBalance(!showBalance)} className="text-white/60 hover:text-white transition-colors">
                       {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                     </button>
                   </div>
                   <div className="text-[32px] font-bold tracking-tight mb-2">
                     {formatMoney("2,840.75")}
                   </div>
                   <div className="flex items-center gap-1.5 text-xs text-brand-light font-medium bg-white/10 w-fit px-2.5 py-1 rounded-full">
                      <ArrowUpRight className="w-3 h-3 text-green-400" />
                      <span className="text-green-300">12%</span> <span className="text-white/70">from last week</span>
                   </div>
                 </div>
               </div>
               
               {/* Decorative background A-shape or graphics */}
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
                   {/* Fake Donut Chart */}
                   <div className="relative w-28 h-28 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                         {/* Available 35% */}
                         <path className="text-blue-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray="35, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                         {/* Protected 45% */}
                         <path className="text-green-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray="45, 100" strokeDashoffset="-35" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                         {/* Goals 20% */}
                         <path className="text-orange-400" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray="20, 100" strokeDashoffset="-80" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-[10px] text-slate-500 font-medium leading-none mb-1">Total Income</span>
                         <span className="font-bold text-slate-900 text-sm">GH₵ 2,840</span>
                      </div>
                   </div>
                   <div className="flex-1 flex flex-col gap-3 justify-center">
                      <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-slate-600 font-medium">Protected</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">45%</span> <span className="font-semibold text-slate-900">GH₵1,278.00</span></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div><span className="text-slate-600 font-medium">Goals</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">20%</span> <span className="font-semibold text-slate-900">GH₵568.00</span></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-slate-600 font-medium">Available</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">35%</span> <span className="font-semibold text-slate-900">GH₵994.75</span></div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Mobile-only Stats Row */}
             <div className="flex md:hidden items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><Wallet className="w-4 h-4"/></div>
                   <div className="text-center">
                      <div className="text-xs font-semibold text-slate-900">Available</div>
                      <div className="text-[10px] text-slate-500">GH₵ 994.75</div>
                   </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center"><ShieldCheck className="w-4 h-4"/></div>
                   <div className="text-center">
                      <div className="text-xs font-semibold text-slate-900">Protected</div>
                      <div className="text-[10px] text-slate-500">GH₵ 1,278.00</div>
                   </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><Target className="w-4 h-4"/></div>
                   <div className="text-center">
                      <div className="text-xs font-semibold text-slate-900">Goals</div>
                      <div className="text-[10px] text-slate-500">GH₵ 568.00</div>
                   </div>
                </div>
             </div>

          </div>

          {/* Quick Actions (Desktop styling differs slightly, but functionality same) */}
          <div className="grid grid-cols-4 md:flex md:flex-row gap-3 md:gap-4 md:bg-white md:p-3 md:rounded-2xl md:border md:border-slate-200 shadow-sm md:shadow-none">
             {[
                { icon: Download, label: "Add Income", sub: "Deposit money", color: "text-brand", bg: "bg-brand/10" },
                { icon: Target, label: "Create Goal", sub: "Save for something", color: "text-brand", bg: "bg-brand/10" },
                { icon: ShieldCheck, label: "Add Rule", sub: "Automate money", color: "text-brand", bg: "bg-brand/10" },
                { icon: ArrowRightLeft, label: "Transfer", sub: "Move between accounts", color: "text-brand", bg: "bg-brand/10" },
             ].map((action, idx) => (
                <button key={idx} className="flex flex-col md:flex-row items-center md:items-start md:flex-1 gap-2 md:gap-4 p-2 md:p-3 md:hover:bg-slate-50 rounded-xl transition-colors group">
                   <div className={cn("w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", action.bg, action.color)}>
                      <action.icon className="w-5 h-5 md:w-4 md:h-4" />
                   </div>
                   <div className="text-center md:text-left">
                      <div className="text-xs md:text-sm font-semibold text-slate-900">{action.label}</div>
                      <div className="hidden md:block text-[11px] text-slate-500 mt-0.5">{action.sub}</div>
                   </div>
                </button>
             ))}
          </div>

          {/* Accounts Section (Desktop primarily in the image) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
             <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-slate-900">Accounts</h3>
                <Link href="/accounts" className="text-xs text-brand font-medium hover:underline">View all</Link>
             </div>
             <div className="grid grid-cols-3 gap-4">
                {/* Available */}
                <div className="bg-brand text-white p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Wallet className="w-4 h-4"/></div>
                   <div>
                     <div className="text-xs text-white/80 font-medium mb-1">Available Balance</div>
                     <div className="text-xl font-bold">{formatMoney("994.75")}</div>
                     <div className="text-[10px] text-white/60 mt-2">≈ 35% of total</div>
                   </div>
                </div>
                {/* Protected */}
                <div className="bg-[#E6F8F0] border border-[#BDE8D6] text-[#0A5436] p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-[#CCEFDF] flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-[#127951]"/></div>
                   <div>
                     <div className="text-xs font-medium mb-1 opacity-80">Protected Funds</div>
                     <div className="text-xl font-bold text-[#0D6A45]">{formatMoney("1,278.00")}</div>
                     <div className="text-[10px] opacity-70 mt-2">≈ 45% of total</div>
                   </div>
                </div>
                {/* Goals */}
                <div className="bg-[#FFF4ED] border border-[#FFD9C2] text-[#80380A] p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-[#FFE1CD] flex items-center justify-center"><Target className="w-4 h-4 text-[#B35212]"/></div>
                   <div>
                     <div className="text-xs font-medium mb-1 opacity-80">Goals</div>
                     <div className="text-xl font-bold text-[#A64A0F]">{formatMoney("568.00")}</div>
                     <div className="text-[10px] opacity-70 mt-2">≈ 20% of total</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Recent Transactions (Mobile and Desktop) */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 md:p-6 shadow-sm">
             <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-slate-900 text-base md:text-lg">Recent Transactions</h3>
                <Link href="/transactions" className="text-xs text-brand font-medium hover:underline">View all</Link>
             </div>
             <div className="space-y-5">
                <div className="flex items-center justify-between group cursor-pointer">
                   <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                         <Wifi className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                         <div className="font-semibold text-sm text-slate-900">MTN Data Bundle</div>
                         <div className="text-[11px] text-slate-500 mt-0.5">Today • Telecom</div>
                      </div>
                   </div>
                   <div className="font-semibold text-sm text-slate-700">- GH₵50.00</div>
                </div>
                
                <div className="flex items-center justify-between group cursor-pointer">
                   <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                         <Download className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                         <div className="font-semibold text-sm text-slate-900">Salary Deposit</div>
                         <div className="text-[11px] text-slate-500 mt-0.5">Today • Income</div>
                      </div>
                   </div>
                   <div className="font-semibold text-sm text-green-600">+ GH₵850.00</div>
                </div>
                
                <div className="flex items-center justify-between group cursor-pointer">
                   <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                         <PieChart className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                         <div className="font-semibold text-sm text-slate-900">KFC</div>
                         <div className="text-[11px] text-slate-500 mt-0.5">Yesterday • Food</div>
                      </div>
                   </div>
                   <div className="font-semibold text-sm text-slate-700">- GH₵120.00</div>
                </div>
             </div>
          </div>

        </div>

        {/* Right Column (Side Panels) */}
        <div className="md:col-span-4 flex flex-col gap-5 md:gap-6">
           
           {/* Next Automatic Actions */}
           <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm hidden md:block">
              <div className="flex justify-between items-center mb-5">
                 <h3 className="font-semibold text-slate-900">Next Automatic Actions</h3>
                 <Link href="/rules" className="text-xs text-brand font-medium hover:underline">View all</Link>
              </div>
              <div className="space-y-4">
                 <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-[#E6F8F0] text-[#127951] flex items-center justify-center shrink-0 mt-0.5"><Target className="w-4 h-4" /></div>
                    <div>
                       <div className="text-sm font-semibold text-slate-900">Save for Laptop</div>
                       <div className="text-xs text-slate-500 mt-1">Tomorrow • GH₵200.00</div>
                    </div>
                 </div>
                 
                 <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5"><Wifi className="w-4 h-4" /></div>
                    <div>
                       <div className="text-sm font-semibold text-slate-900">Internet & Data</div>
                       <div className="text-xs text-slate-500 mt-1">In 3 days • GH₵50.00</div>
                    </div>
                 </div>
                 
                 <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 mt-0.5"><HomeIcon className="w-4 h-4" /></div>
                    <div>
                       <div className="text-sm font-semibold text-slate-900">House Rent</div>
                       <div className="text-xs text-slate-500 mt-1">In 7 days • GH₵800.00</div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Your Progress (Goals) */}
           <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm hidden md:block">
              <div className="flex justify-between items-center mb-5">
                 <h3 className="font-semibold text-slate-900">Your Progress</h3>
                 <Link href="/goals" className="text-xs text-brand font-medium hover:underline">View all</Link>
              </div>
              
              <div className="flex items-center gap-5">
                 <div className="relative w-20 h-20 shrink-0">
                   <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-brand" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" strokeDasharray="72, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                   </svg>
                   <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900">
                      72%
                   </div>
                 </div>
                 <div>
                    <div className="text-xs font-semibold text-brand mb-1">Goal Progress</div>
                    <div className="font-semibold text-sm text-slate-900">Laptop Upgrade</div>
                    <div className="text-xs text-slate-500 mt-1">GH₵ 1,440 / 2,000</div>
                 </div>
              </div>
              
              <div className="mt-6 bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 flex gap-3 items-start">
                 <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                 </div>
                 <div>
                    <div className="text-xs font-semibold text-slate-900">You&apos;re on the right track!</div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">Keep following your rules and build the life you want.</div>
                 </div>
              </div>
           </div>

        </div>
      </div>

    </div>
  );
}
