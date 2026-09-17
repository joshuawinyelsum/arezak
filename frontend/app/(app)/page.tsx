"use client";

import React, { useState, useEffect } from "react";
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
  PieChart,
  Loader2,
  AlertCircle,
  Laptop
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type Money = {
  amount_pesewas: number;
  currency: string;
};

type Account = {
  id: string;
  name: string;
  total_balance: Money;
  available_balance: Money;
  locked_balance: Money;
  reserved_balance: Money;
};

type Transaction = {
  id: string;
  type: string;
  amount: Money;
  status: string;
  description?: string;
  created_at: string;
};

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked_amount: number;
  status: string;
};

const getIconForName = (name: string, type: string) => {
  const n = (name || type).toLowerCase();
  if (n.includes("laptop") || n.includes("tech") || n.includes("macbook")) return { Icon: Laptop, color: "text-blue-500", bg: "bg-blue-50" };
  if (n.includes("home") || n.includes("house")) return { Icon: HomeIcon, color: "text-red-500", bg: "bg-red-50" };
  if (n.includes("emergency") || n.includes("safe")) return { Icon: ShieldCheck, color: "text-green-500", bg: "bg-green-50" };
  if (n.includes("data") || n.includes("airtime") || n.includes("wifi")) return { Icon: Wifi, color: "text-orange-500", bg: "bg-orange-50" };
  if (type === "INCOME" || type === "GOAL_RELEASE") return { Icon: Download, color: "text-green-500", bg: "bg-green-50" };
  return { Icon: PieChart, color: "text-slate-500", bg: "bg-slate-50" };
};

export default function Dashboard() {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ accounts: Account[], txs: Transaction[], goals: Goal[] } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      try {
        const [accRes, txRes, goalRes] = await Promise.all([
          apiFetch("/accounts"),
          apiFetch("/transactions"),
          apiFetch("/goals")
        ]);

        if (!accRes.ok || !txRes.ok || !goalRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const [accounts, txs, goals] = await Promise.all([
          accRes.json(),
          txRes.json(),
          goalRes.json()
        ]);

        if (isMounted) {
          setData({ accounts, txs, goals });
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "An error occurred");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDashboardData();
    return () => { isMounted = false; };
  }, [user]); // reload if user changes (logout/login)

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <p className="text-base font-semibold text-slate-900">Unable to load dashboard</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  // Aggregation
  let totalAvailable = 0;
  let totalReserved = 0;
  let totalLocked = 0;
  let totalSum = 0;

  data.accounts.forEach(acc => {
    totalAvailable += acc.available_balance.amount_pesewas;
    totalReserved += acc.reserved_balance.amount_pesewas;
    totalLocked += acc.locked_balance.amount_pesewas;
    totalSum += acc.total_balance.amount_pesewas;
  });

  const formatMoney = (pesewas: number) => {
    if (!showBalance) return "GH₵ ••••••••";
    return `GH₵ ${(pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPercentage = (value: number) => {
    if (totalSum === 0) return 0;
    return Math.round((value / totalSum) * 100);
  };

  const availPct = getPercentage(totalAvailable);
  const protPct = getPercentage(totalReserved);
  const goalPct = getPercentage(totalLocked);

  // Pick top goal to highlight
  const topGoal = data.goals.filter(g => g.status === "ACTIVE" || g.status === "ACHIEVED")[0] || null;
  const topGoalProgress = topGoal && topGoal.target_amount > 0 ? Math.floor((topGoal.current_amount / topGoal.target_amount) * 100) : 0;

  // Recent transactions (top 3)
  const recentTxs = data.txs.slice(0, 3);

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      
      <div className="flex flex-col gap-1 md:mt-4">
         <h1 className="text-[22px] md:text-2xl font-bold text-slate-900 tracking-tight">Good morning, {firstName} 👋</h1>
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
                     {formatMoney(totalAvailable)}
                   </div>
                   {/* Static trend removed, no backend trend API yet */}
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
                         {totalSum > 0 ? (
                           <>
                             {/* Available */}
                             <path className="text-blue-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${availPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                             {/* Protected */}
                             <path className="text-green-500" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${protPct}, 100`} strokeDashoffset={`-${availPct}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                             {/* Goals */}
                             <path className="text-orange-400" strokeWidth="4" stroke="currentColor" fill="none" strokeDasharray={`${goalPct}, 100`} strokeDashoffset={`-${availPct + protPct}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                           </>
                         ) : (
                           <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                         )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-[10px] text-slate-500 font-medium leading-none mb-1">Total Assets</span>
                         <span className="font-bold text-slate-900 text-sm">{formatMoney(totalSum)}</span>
                      </div>
                   </div>
                   <div className="flex-1 flex flex-col gap-3 justify-center">
                      <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-slate-600 font-medium">Protected</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">{protPct}%</span> <span className="font-semibold text-slate-900">{formatMoney(totalReserved)}</span></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div><span className="text-slate-600 font-medium">Goals</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">{goalPct}%</span> <span className="font-semibold text-slate-900">{formatMoney(totalLocked)}</span></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-slate-600 font-medium">Available</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-400">{availPct}%</span> <span className="font-semibold text-slate-900">{formatMoney(totalAvailable)}</span></div>
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
             </div>
          </div>

          {/* Quick Actions */}
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
          </div>

          {/* Accounts Section */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
             <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-slate-900">Accounts Summary</h3>
                <Link href="/accounts" className="text-xs text-brand font-medium hover:underline">View all</Link>
             </div>
             <div className="grid grid-cols-3 gap-4">
                <div className="bg-brand text-white p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Wallet className="w-4 h-4"/></div>
                   <div>
                     <div className="text-xs text-white/80 font-medium mb-1">Available Balance</div>
                     <div className="text-xl font-bold">{formatMoney(totalAvailable)}</div>
                     <div className="text-[10px] text-white/60 mt-2">≈ {availPct}% of total</div>
                   </div>
                </div>
                <div className="bg-[#E6F8F0] border border-[#BDE8D6] text-[#0A5436] p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-[#CCEFDF] flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-[#127951]"/></div>
                   <div>
                     <div className="text-xs font-medium mb-1 opacity-80">Protected Funds</div>
                     <div className="text-xl font-bold text-[#0D6A45]">{formatMoney(totalReserved)}</div>
                     <div className="text-[10px] opacity-70 mt-2">≈ {protPct}% of total</div>
                   </div>
                </div>
                <div className="bg-[#FFF4ED] border border-[#FFD9C2] text-[#80380A] p-5 rounded-2xl flex flex-col justify-between h-36">
                   <div className="w-8 h-8 rounded-full bg-[#FFE1CD] flex items-center justify-center"><Target className="w-4 h-4 text-[#B35212]"/></div>
                   <div>
                     <div className="text-xs font-medium mb-1 opacity-80">Goals (Locked)</div>
                     <div className="text-xl font-bold text-[#A64A0F]">{formatMoney(totalLocked)}</div>
                     <div className="text-[10px] opacity-70 mt-2">≈ {goalPct}% of total</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 md:p-6 shadow-sm">
             <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-slate-900 text-base md:text-lg">Recent Transactions</h3>
                <Link href="/transactions" className="text-xs text-brand font-medium hover:underline">View all</Link>
             </div>
             {recentTxs.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">
                  No recent transactions
                </div>
             ) : (
                <div className="space-y-5">
                  {recentTxs.map(tx => {
                     const isPositive = tx.type === "INCOME" || tx.type === "GOAL_RELEASE";
                     const { Icon, color, bg } = getIconForName(tx.description || "", tx.type);
                     return (
                      <div key={tx.id} className="flex items-center justify-between group">
                         <div className="flex items-center gap-3.5">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform", bg)}>
                               <Icon className={cn("w-4 h-4", color)} />
                            </div>
                            <div>
                               <div className="font-semibold text-sm text-slate-900 capitalize">{tx.description || tx.type.toLowerCase()}</div>
                               <div className="text-[11px] text-slate-500 mt-0.5">{new Date(tx.created_at).toLocaleDateString()} • {tx.type}</div>
                            </div>
                         </div>
                         <div className={cn("font-semibold text-sm", isPositive ? "text-green-600" : "text-slate-700")}>
                            {isPositive ? "+" : "-"} GH₵{(tx.amount.amount_pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </div>
                      </div>
                     );
                  })}
                </div>
             )}
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
              <div className="text-center py-8">
                 <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                 <p className="text-sm font-medium text-slate-900">No active rules</p>
                 <p className="text-xs text-slate-500 mt-1">Automate your finances with rules.</p>
              </div>
           </div>

           {/* Your Progress (Goals) */}
           <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm hidden md:block">
              <div className="flex justify-between items-center mb-5">
                 <h3 className="font-semibold text-slate-900">Your Progress</h3>
                 <Link href="/goals" className="text-xs text-brand font-medium hover:underline">View all</Link>
              </div>
              
              {!topGoal ? (
                 <div className="text-center py-6 text-sm text-slate-500">
                    No active goals found.
                 </div>
              ) : (
                 <>
                    <div className="flex items-center gap-5">
                       <div className="relative w-20 h-20 shrink-0">
                         <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className={cn("transition-all duration-1000", topGoalProgress === 100 ? "text-green-500" : "text-brand")} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" strokeDasharray={`${Math.min(topGoalProgress, 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900">
                            {topGoalProgress}%
                         </div>
                       </div>
                       <div>
                          <div className="text-xs font-semibold text-brand mb-1">Goal Progress</div>
                          <div className="font-semibold text-sm text-slate-900">{topGoal.name}</div>
                          <div className="text-xs text-slate-500 mt-1">GH₵ {(topGoal.current_amount / 100).toLocaleString()} / {(topGoal.target_amount / 100).toLocaleString()}</div>
                       </div>
                    </div>
                    
                    <div className="mt-6 bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 flex gap-3 items-start">
                       <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                       </div>
                       <div>
                          <div className="text-xs font-semibold text-slate-900">You&apos;re on the right track!</div>
                          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">Keep funding your goal to reach your target.</div>
                       </div>
                    </div>
                 </>
              )}
           </div>

        </div>
      </div>

    </div>
  );
}
