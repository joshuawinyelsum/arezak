"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, ShieldCheck, Target, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AccountsPage() {
  const [showBalance, setShowBalance] = useState(true);
  const formatMoney = (amount: string) => showBalance ? `GH₵ ${amount}` : "GH₵ ••••••••";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div className="flex items-center gap-3">
           <Link href="/" className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-700" />
           </Link>
           <h1 className="text-xl md:text-2xl font-bold text-slate-900">Accounts</h1>
        </div>
        <button onClick={() => setShowBalance(!showBalance)} className="text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 p-2 rounded-full shadow-sm">
           {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Accounts List */}
      <div className="space-y-4">
         
         {/* Available */}
         <div className="bg-brand text-white p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-brand/20">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 text-white" />
               </div>
               <div>
                  <div className="text-sm text-white/80 font-medium mb-0.5">Available Balance</div>
                  <div className="text-sm text-white/60">Free to spend</div>
               </div>
            </div>
            <div className="text-2xl font-bold">{formatMoney("994.75")}</div>
         </div>

         {/* Protected */}
         <div className="bg-[#E6F8F0] border border-[#BDE8D6] text-[#0A5436] p-6 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-[#CCEFDF] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-[#127951]" />
               </div>
               <div>
                  <div className="text-sm font-medium mb-0.5 opacity-90">Protected Funds</div>
                  <div className="text-sm opacity-70">Saved for obligations</div>
               </div>
            </div>
            <div className="text-xl font-bold text-[#0D6A45]">{formatMoney("1,278.00")}</div>
         </div>

         {/* Goals */}
         <div className="bg-[#FFF4ED] border border-[#FFD9C2] text-[#80380A] p-6 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-[#FFE1CD] flex items-center justify-center shrink-0">
                  <Target className="w-6 h-6 text-[#B35212]" />
               </div>
               <div>
                  <div className="text-sm font-medium mb-0.5 opacity-90">Goals</div>
                  <div className="text-sm opacity-70">Locked towards targets</div>
               </div>
            </div>
            <div className="text-xl font-bold text-[#A64A0F]">{formatMoney("568.00")}</div>
         </div>

      </div>

      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex gap-4 mt-6 items-start shadow-sm">
         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-slate-500" />
         </div>
         <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">Strict financial invariants</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
               Your total financial state is rigorously divided. You cannot spend protected funds or locked goals. The system will enforce this automatically at the transaction level.
            </p>
         </div>
      </div>

    </div>
  );
}

