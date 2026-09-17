"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Laptop, Home, Shield, Plane, Wallet, Loader2, AlertCircle, Target, ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Money = {
  amount_pesewas: number;
  currency: string;
};

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked_amount: number;
  currency: string;
  status: string; // ACTIVE, ACHIEVED, RELEASED
};

type Account = {
  id: string;
  name: string;
  available_balance: Money;
};

const getIconForName = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("laptop") || n.includes("tech") || n.includes("macbook")) return { icon: Laptop, color: "text-blue-500", bg: "bg-blue-50" };
  if (n.includes("home") || n.includes("house")) return { icon: Home, color: "text-red-500", bg: "bg-red-50" };
  if (n.includes("emergency") || n.includes("safe")) return { icon: Shield, color: "text-green-500", bg: "bg-green-50" };
  if (n.includes("travel") || n.includes("vacation") || n.includes("flight")) return { icon: Plane, color: "text-orange-500", bg: "bg-orange-50" };
  return { icon: Target, color: "text-slate-600", bg: "bg-slate-100" };
};

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [modalMode, setModalMode] = useState<"contribute" | "release" | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalsRes, accRes] = await Promise.all([
        apiFetch("/goals/"),
        apiFetch("/accounts")
      ]);
      const gData = await goalsRes.json();
      const aData = await accRes.json();
      setGoals(gData);
      setAccounts(aData);
      if (aData.length > 0 && !accountId) {
        setAccountId(aData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load goals.");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (goal: Goal, mode: "contribute" | "release") => {
    setSelectedGoal(goal);
    setModalMode(mode);
    setAmountStr("");
    setModalError(null);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setSelectedGoal(null);
    setModalMode(null);
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || isSubmitting || !accountId) return;

    const amountFloat = parseFloat(amountStr);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setModalError("Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    const amountPesewas = Math.round(amountFloat * 100);

    try {
      const res = await apiFetch(`/goals/${selectedGoal.id}/contributions`, {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID()
        },
        body: JSON.stringify({ amount: amountPesewas, account_id: accountId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || "Contribution failed.");
      }

      await loadData();
      closeModal();
    } catch (err: any) {
      setModalError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedGoal || isSubmitting) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiFetch(`/goals/${selectedGoal.id}/release`, {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID()
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || "Release failed.");
      }

      await loadData();
      closeModal();
    } catch (err: any) {
      setModalError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPesewas = (pesewas: number) => {
    return (pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filteredGoals = goals.filter(g => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return g.status === "ACTIVE" || g.status === "ACHIEVED"; // ACHIEVED implies funds still locked waiting for release
    if (activeTab === "completed") return g.status === "RELEASED";
    return true;
  });

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div className="flex items-center gap-3">
           <Link href="/" className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-700" />
           </Link>
           <h1 className="text-xl md:text-2xl font-bold text-slate-900">Goals</h1>
        </div>
        <Link href="/goals/create" className="bg-brand text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-brand/90 transition-colors shadow-sm shadow-brand/20">
           Create Goal
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-4">
         {[
           { id: "all", label: `All (${goals.length})` },
           { id: "active", label: `Active (${goals.filter(g => g.status === "ACTIVE" || g.status === "ACHIEVED").length})` },
           { id: "completed", label: `Completed (${goals.filter(g => g.status === "RELEASED").length})` }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={cn(
               "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
               activeTab === tab.id 
                 ? "bg-brand text-white shadow-sm" 
                 : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
             )}
           >
             {tab.label}
           </button>
         ))}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-sm font-medium">Loading goals...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center text-center">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="font-medium">Failed to load goals</p>
          <p className="text-sm mt-1 opacity-80">{error}</p>
          <button 
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && filteredGoals.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 p-10 rounded-2xl flex flex-col items-center text-center mt-6">
          <Target className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No goals yet</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">You haven&apos;t created any goals in this category.</p>
          <Link href="/goals/create" className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            Start saving today
          </Link>
        </div>
      )}

      {/* Goal List */}
      {!isLoading && !error && filteredGoals.length > 0 && (
        <div className="space-y-4">
           {filteredGoals.map(goal => {
              const { icon: Icon, color, bg } = getIconForName(goal.name);
              const percentage = goal.target_amount > 0 ? Math.floor((goal.current_amount / goal.target_amount) * 100) : 0;
              
              return (
                <div key={goal.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-colors group flex flex-col">
                   <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4 flex-1">
                         <div className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0", bg, color)}>
                            <Icon className="w-6 h-6" />
                         </div>
                         <div className="flex-1">
                            <h3 className="font-bold text-slate-900 text-[15px] flex items-center gap-2">
                               {goal.name}
                               {goal.status === "ACHIEVED" && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Achieved</span>}
                               {goal.status === "RELEASED" && <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Released</span>}
                            </h3>
                            <div className="text-xs text-brand font-medium mt-0.5 mb-1.5">
                               GH₵ {formatPesewas(goal.current_amount)} / {formatPesewas(goal.target_amount)}
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                               <div 
                                 className={cn("h-full rounded-full transition-all duration-1000", goal.status === "RELEASED" ? "bg-slate-300" : "bg-brand")}
                                 style={{ width: `${Math.min(percentage, 100)}%` }}
                               />
                            </div>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                         <div className="text-xs font-bold text-slate-900">{percentage > 0 ? `${percentage}%` : ""}</div>
                      </div>
                   </div>

                   {/* Actions Row */}
                   {goal.status !== "RELEASED" && (
                     <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                        {goal.status === "ACTIVE" && (
                           <button 
                              onClick={() => openModal(goal, "contribute")}
                              className="flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand/20 transition-colors"
                           >
                              <ArrowDownCircle className="w-4 h-4" /> Contribute
                           </button>
                        )}
                        {goal.status === "ACHIEVED" && (
                           <button 
                              onClick={() => openModal(goal, "release")}
                              className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors shadow-sm"
                           >
                              <ArrowUpCircle className="w-4 h-4" /> Release Funds
                           </button>
                        )}
                     </div>
                   )}
                </div>
              );
           })}
        </div>
      )}

      {/* Modal Overlay */}
      {selectedGoal && modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                 {modalMode === "contribute" ? "Fund Goal" : "Release Funds"}
              </h2>
              <button 
                onClick={closeModal}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl mb-4 text-center border border-red-100">
                {modalError}
              </div>
            )}

            {modalMode === "contribute" ? (
               <form onSubmit={handleContribute} className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                     <p className="text-xs text-slate-500 mb-1">Target: GH₵{formatPesewas(selectedGoal.target_amount)}</p>
                     <p className="text-lg font-bold text-brand">Current: GH₵{formatPesewas(selectedGoal.current_amount)}</p>
                  </div>

                  <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-1.5">From Account</label>
                     <select 
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        disabled={isSubmitting || accounts.length === 0}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50"
                        required
                     >
                        {accounts.map(acc => (
                           <option key={acc.id} value={acc.id}>{acc.name} (GH₵{formatPesewas(acc.available_balance.amount_pesewas)} available)</option>
                        ))}
                     </select>
                  </div>

                  <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-1.5">Amount (GH₵)</label>
                     <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        placeholder="0.00"
                        disabled={isSubmitting}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50"
                        required
                     />
                  </div>

                  <button 
                     type="submit"
                     disabled={isSubmitting}
                     className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:bg-brand/90"
                  >
                     {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                     ) : (
                        "Confirm Contribution"
                     )}
                  </button>
               </form>
            ) : (
               <div className="space-y-4">
                  <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                     <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                     <p className="text-sm font-medium text-green-800">You achieved this goal!</p>
                     <p className="text-xs text-green-600 mt-1">GH₵{formatPesewas(selectedGoal.locked_amount)} is currently locked.</p>
                  </div>
                  
                  <p className="text-sm text-slate-600 text-center">
                     Releasing this goal will unlock the funds and return them to your available balance.
                  </p>

                  <button 
                     onClick={handleRelease}
                     disabled={isSubmitting}
                     className="w-full bg-green-500 text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:bg-green-600"
                  >
                     {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Releasing...</>
                     ) : (
                        "Release Funds Now"
                     )}
                  </button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
