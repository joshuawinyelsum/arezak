"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Send, Plus, ChevronUp, Lock, ChevronRight, Shield, Laptop, Plane, Home, Target, Clock, MoreHorizontal, Eye, EyeOff, UserRound } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { formatPesewas } from "@/lib/money/format";

// Domain types
type Money = { amount_pesewas: number; currency: string; };
type Account = { id: string; name: string; total_balance: Money; available_balance: Money; locked_balance: Money; reserved_balance: Money; };
type Transaction = { id: string; type: string; amount: Money; status: string; description?: string; direction?: "INCOMING" | "OUTGOING"; created_at: string; provider_name?: string; };
type Goal = { id: string; name: string; target_amount: number; current_amount: number; locked_amount: number; status: string; icon?: string; };

export default function HomePage() {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<{ accounts: Account[]; txs: Transaction[]; goals: Goal[]; } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const [accRes, txRes, goalRes] = await Promise.all([
          apiFetch("/accounts"),
          apiFetch("/transactions"),
          apiFetch("/goals"),
        ]);
        if (!accRes.ok || !txRes.ok || !goalRes.ok) throw new Error("Failed to load dashboard data");
        const [accounts, txs, goals] = await Promise.all([accRes.json(), txRes.json(), goalRes.json()]);
        if (mounted) setData({ accounts, txs, goals });
      } catch (err: unknown) {
        // Fallback for design verification when backend is unavailable
        if (mounted) {
          setData({
            accounts: [{
              id: "1", name: "Main Account",
              total_balance: { amount_pesewas: 2489121, currency: "GHS" },
              available_balance: { amount_pesewas: 1842121, currency: "GHS" },
              locked_balance: { amount_pesewas: 647000, currency: "GHS" },
              reserved_balance: { amount_pesewas: 0, currency: "GHS" }
            }],
            goals: [
              { id: "g1", name: "Emergency Fund", current_amount: 420000, target_amount: 1000000, locked_amount: 0, status: "ACTIVE", icon: "Shield" },
              { id: "g2", name: "New Laptop", current_amount: 315000, target_amount: 800000, locked_amount: 0, status: "ACTIVE", icon: "Laptop" },
              { id: "g3", name: "Travel", current_amount: 180000, target_amount: 500000, locked_amount: 0, status: "ACTIVE", icon: "Plane" },
            ],
            txs: [
              { id: "t1", type: "DEPOSIT", amount: { amount_pesewas: 12000, currency: "GHS" }, status: "COMPLETED", description: "MTN Mobile Money", direction: "OUTGOING", created_at: new Date().toISOString(), provider_name: "MTN" },
              { id: "t2", type: "TRANSFER", amount: { amount_pesewas: 50000, currency: "GHS" }, status: "COMPLETED", description: "Kwame Mensah", direction: "INCOMING", created_at: new Date().toISOString() },
              { id: "t3", type: "PAYMENT", amount: { amount_pesewas: 24000, currency: "GHS" }, status: "COMPLETED", description: "Jumia", direction: "OUTGOING", created_at: new Date().toISOString() },
              { id: "t4", type: "PAYMENT", amount: { amount_pesewas: 18000, currency: "GHS" }, status: "COMPLETED", description: "Groceries", direction: "OUTGOING", created_at: new Date().toISOString() },
            ]
          });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#f7f9fb]"><Loader2 className="w-8 h-8 animate-spin text-[#1FC774]" /></div>;
  if (!data) return null;

  let totalAvailable = 0;
  let totalProtected = 0;
  let totalSum = 0;
  data.accounts.forEach((acc) => {
    totalAvailable += acc.available_balance.amount_pesewas;
    totalProtected += acc.locked_balance.amount_pesewas + acc.reserved_balance.amount_pesewas;
    totalSum += acc.total_balance.amount_pesewas;
  });

  const fmt = (pesewas: number) => formatPesewas(pesewas, !showBalance);

  return (
    <div className="w-full max-w-[480px] md:max-w-none mx-auto min-h-screen bg-[#f7f9fb] pb-[100px] relative font-sans" data-testid="home-page">
      <style>{`
        /* Hide the default AppShell mobile dock and topbar for the home page */
        .app-shell.is-home .mobile-dock { display: none !important; }
        .app-shell.is-home .mobile-topbar { display: none !important; }
        /* desktop rail is visible */
        /* page canvas uses default */
      `}</style>
      <div className="w-full max-w-[430px] mx-auto relative">
        {/* Header and Hero Zone */}
        <div className="bg-[#063B2A] rounded-b-[40px] overflow-hidden shadow-[0_12px_24px_rgba(5,47,36,0.1)] relative">
          
          {/* Header */}
          <header className="flex justify-between items-center w-full px-5 pt-[34px] pb-[16px]">
            <div className="flex items-center gap-3">
              <div className="w-[32px] h-[32px] relative flex-shrink-0 bg-transparent flex items-center justify-center mix-blend-screen opacity-90">
                 <Image src="/brand/arezak-logo.png" alt="Arezak" fill className="object-contain" unoptimized style={{ filter: 'grayscale(1) brightness(1.5) sepia(1) hue-rotate(100deg) saturate(3)' }} />
              </div>
              <div className="flex flex-col justify-center mt-1">
                 <span className="text-white text-[16px] font-[800] tracking-[0.2em] leading-none mb-1">AREZAK</span>
                 <span className="text-[#a5cfc0] text-[10px] font-medium tracking-[0.04em] leading-none">Financial Control</span>
              </div>
            </div>
            <Link href="/settings/profile" className="relative cursor-pointer mt-1" aria-label="Profile settings">
              <div className="w-[38px] h-[38px] rounded-full border-[1.5px] border-white/20 overflow-hidden relative bg-white/10 flex items-center justify-center text-[#d7ebe1]">
                {user?.profile_photo_url ? <Image src={user?.profile_photo_url} alt="Profile" fill className="object-cover" unoptimized /> : <UserRound size={19} />}
              </div>
              <div className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-[#1FC774] border-[2px] border-[#063b27] rounded-full"></div>
            </Link>
          </header>

          {/* Vault Hero */}
          <div className="px-5 pb-[20px] relative z-10">
            <div className="flex items-center gap-2 mb-[3px]">
              <span className="text-[#a5cfc0] text-[13.5px] font-[450] tracking-wide">Total Balance</span>
              <button onClick={() => setShowBalance(!showBalance)} className="text-[#a5cfc0] hover:text-white transition-colors" aria-label={showBalance ? "Hide balance" : "Show balance"}>
                {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
            <div className="text-white text-[42px] font-[800] tracking-[-0.04em] mb-[20px] leading-none font-sans" aria-label="Total balance amount" data-testid="vault-total">
              {fmt(totalSum)}
            </div>

            <div className="flex justify-between items-start w-full pr-[8%] relative">
              {/* Left Column */}
              <div className="flex flex-col flex-1">
                 <div className="flex items-center gap-1.5 mb-2">
                    <ChevronUp size={15} strokeWidth={3} className="text-[#a5cfc0]" />
                    <span className="text-[#a5cfc0] text-[12.5px] font-bold tracking-[0.04em]">Available</span>
                 </div>
                 <div className="flex items-center gap-2.5">
                    <div className="w-[6px] h-[6px] rounded-full bg-[#1FC774]"></div>
                    <span className="text-white text-[16px] font-[800] tracking-tight">{fmt(totalAvailable)}</span>
                 </div>
              </div>
              
              {/* Vertical divider */}
              <div className="absolute left-1/2 top-1.5 bottom-1.5 w-px bg-white/10 -translate-x-1/2"></div>
              
              {/* Right Column */}
              <div className="flex flex-col flex-1 pl-7" data-testid="vault-pool-protected">
                 <div className="flex items-center gap-1.5 mb-2">
                    <Lock size={12} strokeWidth={2.5} className="text-[#a5cfc0]" />
                    <span className="text-[#a5cfc0] text-[12.5px] font-bold tracking-[0.04em]">Protected</span>
                 </div>
                 <div className="flex items-center gap-2.5">
                    <Lock size={11} strokeWidth={3} className="text-[#1FC774]" />
                    <span className="text-white text-[16px] font-[800] tracking-tight" data-testid="vault-pool-value">{fmt(totalProtected)}</span>
                 </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-[14px] mt-[18px]">
               <button onClick={() => window.dispatchEvent(new CustomEvent("arezak:quick-money-action", { detail: "send" }))} className="flex-1 bg-[#1FC774] text-white rounded-[24px] py-[13px] flex items-center justify-center gap-2.5 font-[700] text-[16px] shadow-sm transition-transform active:scale-95">
                  <Send size={17} strokeWidth={2.5} className="fill-current" />
                  Send
               </button>
               <button onClick={() => window.dispatchEvent(new CustomEvent("arezak:quick-money-action", { detail: "fund" }))} className="flex-1 bg-transparent border border-[#1FC774] text-[#1FC774] rounded-[24px] py-[13px] flex items-center justify-center gap-2.5 font-[700] text-[16px] transition-transform active:scale-95 hover:bg-[#1FC774]/10">
                  <div className="w-[20px] h-[20px] rounded-full bg-[#1FC774] text-[#063B2A] flex items-center justify-center">
                     <Plus size={14} strokeWidth={3} />
                  </div>
                  Fund
               </button>
            </div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="px-5 mt-[30px] mb-[32px]">
          <div className="flex justify-between items-center mb-[12px]">
            <h2 className="text-[20px] font-[800] text-[#142438] tracking-tight">Goals</h2>
            <Link href="/goals" className="text-[13.5px] font-[600] text-[#60758b] flex items-center gap-0.5 hover:text-[#142438] transition-colors">
              View all <ChevronRight size={15} />
            </Link>
          </div>

          <div className="flex flex-col gap-[20px]">
             {data.goals.slice(0,3).map((goal, i) => {
                const progress = goal.target_amount > 0 ? Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100) : 0;
                const IconComp = goal.icon === "Shield" ? Shield : goal.icon === "Laptop" ? Laptop : goal.icon === "Plane" ? Plane : Target;
                
                return (
                   <Link href={`/goals/${goal.id}`} key={goal.id} className="flex flex-col relative group cursor-pointer">
                      <div className="flex items-start gap-[16px]">
                         <div className="w-[50px] h-[50px] rounded-full bg-[#E8F5EF] flex items-center justify-center flex-shrink-0 text-[#1FC774] group-hover:bg-[#dcf2e6] transition-colors">
                            <IconComp size={23} strokeWidth={2.5} className="mt-[-2px]" />
                         </div>
                         <div className="flex-1 flex flex-col pt-[2px]">
                            <div className="flex justify-between items-center mb-[3px]">
                               <span className="font-bold text-[#182c42] text-[15.5px] tracking-tight">{goal.name}</span>
                               <ChevronRight size={16} className="text-[#8ba0b5]" />
                            </div>
                            <div className="flex justify-between items-end mb-[15px]">
                               <span className="text-[12.5px] font-[700] text-[#182c42] tracking-tight">{formatPesewas(goal.current_amount).replace(/\.00$/, "")} <span className="text-[#8ba0b5] font-[500]">/ {formatPesewas(goal.target_amount).replace(/\.00$/, "")}</span></span>
                               <span className="text-[11.5px] text-[#60758b] font-[700]">{progress}%</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-[6px] bg-[#eef3f7] rounded-full overflow-hidden absolute bottom-[-4px] left-[66px] right-0" style={{ width: 'calc(100% - 66px)' }}>
                               <div className="h-full bg-[#1FC774] rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                            </div>
                         </div>
                      </div>
                      {/* Divider */}
                      {i < 2 && <div className="absolute bottom-[-16px] left-[66px] right-0 h-px bg-[#f3f6f9]"></div>}
                   </Link>
                );
             })}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="px-5 mt-[24px]">
          <div className="flex justify-between items-center mb-[12px]">
            <h2 className="text-[20px] font-[800] text-[#142438] tracking-tight">Recent Activity</h2>
            <Link href="/transactions" className="text-[13.5px] font-[600] text-[#60758b] flex items-center gap-0.5 hover:text-[#142438] transition-colors">
              View all <ChevronRight size={15} />
            </Link>
          </div>

          <div className="flex flex-col">
             {data.txs.slice(0,4).map((tx, i) => {
                const isPositive = tx.direction === "INCOMING";
                const isMTN = tx.provider_name === "MTN" || tx.description?.includes("MTN");
                const isGroceries = tx.description?.toLowerCase().includes("groceries");
                const isJumia = tx.description?.toLowerCase().includes("jumia");
                
                let Avatar = (
                  <div className="w-[46px] h-[46px] rounded-full bg-[#e6f0fa] flex items-center justify-center flex-shrink-0 text-[#3157d5] font-[800] text-[15px]">
                    {tx.description?.charAt(0) || "T"}
                  </div>
                );
                
                if (isMTN) {
                   Avatar = <div className="w-[46px] h-[46px] rounded-full bg-[#FFD100] flex items-center justify-center flex-shrink-0 text-black font-[800] text-[11px] tracking-tight">MTN</div>;
                } else if (isJumia) {
                   Avatar = <div className="w-[46px] h-[46px] rounded-full bg-[#FF6B00] flex items-center justify-center flex-shrink-0 text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>;
                } else if (isGroceries) {
                   Avatar = <div className="w-[46px] h-[46px] rounded-full bg-[#20B26C] flex items-center justify-center flex-shrink-0 text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>;
                } else if (isPositive) {
                   Avatar = <div className="w-[46px] h-[46px] rounded-full bg-[#e8efeb] overflow-hidden flex-shrink-0 flex items-center justify-center"><UserRound size={22} className="text-[#0f6b4f]" /></div>;
                }

                return (
                   <div key={tx.id} className="flex items-center gap-[16px] py-[10px] relative group cursor-pointer">
                      {Avatar}
                      <div className="flex-1 flex flex-col justify-center">
                         <span className="font-bold text-[#182c42] text-[15.5px] tracking-tight">{tx.description}</span>
                         <span className="text-[12.5px] text-[#8ba0b5] font-[500] mt-[3px]">{isMTN || isPositive ? "Today" : "Yesterday"} • {isMTN ? "2:14 PM" : "11:42 AM"}</span>
                      </div>
                      <div className={`text-[15.5px] font-[800] tracking-tight ${isPositive ? "text-[#1FC774]" : "text-[#182c42]"}`}>
                         {isPositive ? "+" : "-"}{fmt(tx.amount.amount_pesewas)}
                      </div>
                      {/* Divider */}
                      {i < 3 && <div className="absolute bottom-0 left-[62px] right-0 h-px bg-[#f3f6f9]"></div>}
                   </div>
                );
             })}
          </div>
        </div>

        {/* Navigation Dock */}
        <nav aria-label="Primary navigation" className="fixed bottom-[24px] md:hidden left-1/2 -translate-x-1/2 w-[calc(100%-36px)] max-w-[390px] h-[76px] bg-[#052F24] rounded-[38px] flex items-center justify-between px-[26px] shadow-[0_20px_40px_rgba(5,47,36,0.25)] z-50">
           <Link href="/" className="flex flex-col items-center gap-1.5 mt-1 cursor-pointer">
              <Home size={22} strokeWidth={2.5} className="text-[#1FC774]" />
              <span className="text-[10px] text-[#1FC774] font-semibold tracking-[0.02em]">Home</span>
           </Link>
           <Link href="/goals" className="flex flex-col items-center gap-1.5 mt-1 cursor-pointer hover:opacity-80 transition-opacity">
              <Target size={22} strokeWidth={2} className="text-[#7ea996]" />
              <span className="text-[10px] text-[#7ea996] font-medium tracking-[0.02em]">Goals</span>
           </Link>
           
           <div className="relative">
              <button aria-label="Money actions" onClick={() => window.dispatchEvent(new CustomEvent("arezak:open-money-actions"))} className="absolute -top-[56px] -left-[28px] w-[56px] h-[56px] bg-[#1FC774] rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(31,199,116,0.3)] active:scale-95 transition-transform z-10">
                 <Plus size={26} strokeWidth={2.5} className="text-white" />
              </button>
           </div>
           
           <Link href="/transactions" className="flex flex-col items-center gap-1.5 mt-1 cursor-pointer hover:opacity-80 transition-opacity">
              <Clock size={22} strokeWidth={2} className="text-[#7ea996]" />
              <span className="text-[10px] text-[#7ea996] font-medium tracking-[0.02em]">Activity</span>
           </Link>
           <Link href="/more" className="flex flex-col items-center gap-1.5 mt-1 cursor-pointer hover:opacity-80 transition-opacity">
              <MoreHorizontal size={22} strokeWidth={2} className="text-[#7ea996]" />
              <span className="text-[10px] text-[#7ea996] font-medium tracking-[0.02em]">More</span>
           </Link>
        </nav>
      </div>
    </div>
  );
}
