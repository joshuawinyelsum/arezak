"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, ShieldCheck, Target, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Money = {
  amount_pesewas: number;
  currency: string;
};

type Account = {
  id: string;
  name: string;
  status: string;
  available_balance: Money;
  reserved_balance: Money;
  locked_balance: Money;
  total_balance: Money;
};

export default function AccountsPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await apiFetch("/accounts");
        const data = await res.json();
        setAccounts(data);
      } catch (err: any) {
        setError(err.message || "Failed to load accounts.");
      } finally {
        setIsLoading(false);
      }
    }
    loadAccounts();
  }, []);

  const formatPesewas = (pesewas: number) => {
    return (pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatMoney = (pesewas: number) => showBalance ? `GH₵ ${formatPesewas(pesewas)}` : "GH₵ ••••••••";

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
        <button onClick={() => setShowBalance(!showBalance)} className="text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 p-2 rounded-full shadow-sm focus:outline-none">
           {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </header>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-sm font-medium">Loading your accounts...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center text-center">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="font-medium">Failed to load accounts</p>
          <p className="text-sm mt-1 opacity-80">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && accounts.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 p-10 rounded-2xl flex flex-col items-center text-center">
          <Wallet className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No accounts yet</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">You don&apos;t have any accounts set up.</p>
        </div>
      )}

      {!isLoading && !error && accounts.length > 0 && (
        <div className="space-y-10">
          {accounts.map(account => (
            <div key={account.id} className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 px-1">{account.name}</h2>
              
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
                  <div className="text-2xl font-bold">{formatMoney(account.available_balance.amount_pesewas)}</div>
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
                  <div className="text-xl font-bold text-[#0D6A45]">{formatMoney(account.reserved_balance.amount_pesewas)}</div>
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
                  <div className="text-xl font-bold text-[#A64A0F]">{formatMoney(account.locked_balance.amount_pesewas)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && accounts.length > 0 && (
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
      )}

    </div>
  );
}

