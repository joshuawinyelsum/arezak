"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Laptop, Home, Shield, Plane, Wallet, Loader2, AlertCircle, Target, ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { GoalEditModal } from "@/components/GoalEditModal";

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
  lock_type?: string;
  unlock_date?: string;
  is_eligible_for_release?: boolean;
  icon?: string;
  created_at?: string;
};

type Account = {
  id: string;
  name: string;
  available_balance: Money;
  locked_balance: Money;
  total_balance: Money;
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
  const [modalMode, setModalMode] = useState<"contribute" | "release" | "edit" | "delete" | "archive" | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalsRes, accRes] = await Promise.all([
        apiFetch("/goals"),
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
      setError(err.message || "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (goal: Goal, mode: "contribute" | "release" | "edit" | "delete" | "archive") => {
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
        throw new Error(err.detail?.message || err.detail || "Contribution failed.");
      }

      await loadData();
      closeModal();
    } catch (err: any) {
      setModalError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (actionUrl: string, method: string = "POST") => {
    if (!selectedGoal || isSubmitting) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiFetch(`/goals/${selectedGoal.id}${actionUrl}`, {
        method,
        headers: {
          "Idempotency-Key": crypto.randomUUID()
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || "Action failed.");
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
        throw new Error(err.detail?.message || err.detail || "Release failed.");
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

  const sortedGoals = [...goals].sort((a, b) => new Date(b.created_at || "1970-01-01").getTime() - new Date(a.created_at || "1970-01-01").getTime());
  const filteredGoals = sortedGoals.filter(g => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return g.status === "ACTIVE" || g.status === "ACHIEVED"; // ACHIEVED implies funds still locked waiting for release
    if (activeTab === "released") return g.status === "RELEASED" || g.status === "ARCHIVED" || g.status === "CANCELLED";
    return true;
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.total_balance?.amount_pesewas || 0), 0);
  const availableBalance = accounts.reduce((sum, acc) => sum + (acc.available_balance?.amount_pesewas || 0), 0);
  const lockedBalance = accounts.reduce((sum, acc) => sum + (acc.locked_balance?.amount_pesewas || 0), 0);

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

      <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-800 font-medium leading-relaxed">
          Goals allow you to intentionally lock money toward something you want to achieve.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-4">
         {[
           { id: "all", label: `Total Goals (${goals.length})` },
           { id: "active", label: `Active (${goals.filter(g => g.status === "ACTIVE" || g.status === "ACHIEVED").length})` },
           { id: "released", label: `Released/Archived (${goals.filter(g => g.status === "RELEASED" || g.status === "ARCHIVED" || g.status === "CANCELLED").length})` }
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
              let color = "text-brand";
              let bg = "bg-brand/10";
              let legacyIcon = Target;
              if (!goal.icon) {
                const legacy = getIconForName(goal.name);
                legacyIcon = legacy.icon;
                color = legacy.color;
                bg = legacy.bg;
              }

              const percentage = goal.target_amount > 0 ? Math.floor((goal.current_amount / goal.target_amount) * 100) : 0;
              
              return (
                <div key={goal.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-colors group flex flex-col">
                   <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4 flex-1">
                         <div className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0", bg, color)}>
                            {goal.icon ? <Icon name={goal.icon} className="w-6 h-6" /> : React.createElement(legacyIcon, { className: "w-6 h-6" })}
                         </div>
                         <div className="flex-1">
                            <h3 className="font-bold text-slate-900 text-[15px] flex items-center gap-2">
                               <Link href={`/goals/${goal.id}`} className="hover:underline">{goal.name}</Link>
                               {goal.status === "ACHIEVED" && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Achieved</span>}
                               {goal.status === "RELEASED" && <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Released</span>}
                               {goal.status === "ARCHIVED" && <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Archived</span>}
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Locked</div>
                                <div className="text-sm font-bold text-blue-500">GH₵ {formatPesewas(goal.locked_amount)}</div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Remaining</div>
                                <div className="text-sm font-bold text-slate-700">GH₵ {formatPesewas(Math.max(0, goal.target_amount - goal.current_amount))}</div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-brand font-medium mt-3 mb-1.5">
                               <span>GH₵ {formatPesewas(goal.current_amount)} / GH₵ {formatPesewas(goal.target_amount)}</span>
                               <span className="font-bold text-slate-900">{percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                               <div 
                                 className={cn("h-full rounded-full transition-all duration-1000", goal.status === "RELEASED" || goal.status === "ARCHIVED" ? "bg-slate-300" : "bg-brand")}
                                 style={{ width: `${Math.min(percentage, 100)}%` }}
                               />
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100">
                               <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Unlock condition</div>
                               <div className="text-xs font-semibold text-slate-600">
                                 {goal.lock_type === "TARGET_REACHED" || !goal.lock_type ? "When target is reached" : 
                                  goal.lock_type === "DATE_REACHED" && goal.unlock_date ? `Unlock date: ${new Date(goal.unlock_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : "When target is reached"}
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                     {/* Actions Row */}
                     <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <Link 
                           href={`/goals/${goal.id}`}
                           className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                        >
                           View Goal
                        </Link>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                     
                        {goal.status === "ACTIVE" && (
                           <>
                             <button 
                                onClick={() => openModal(goal, "edit")}
                                className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                             >
                                Edit
                             </button>
                             <button 
                                onClick={() => openModal(goal, "contribute")}
                                className="flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand/20 transition-colors"
                             >
                                <ArrowDownCircle className="w-4 h-4" /> Contribute
                             </button>
                             {goal.current_amount === 0 && (
                               <button 
                                  onClick={() => openModal(goal, "delete")}
                                  className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                               >
                                  Delete
                               </button>
                             )}
                           </>
                        )}
                        {goal.status === "ACHIEVED" && (
                           <button 
                              onClick={() => goal.is_eligible_for_release ? openModal(goal, "release") : undefined}
                              disabled={!goal.is_eligible_for_release}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                                goal.is_eligible_for_release 
                                  ? "bg-green-500 text-white hover:bg-green-600" 
                                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                              }`}
                           >
                              <ArrowUpCircle className="w-4 h-4" /> Release Funds
                           </button>
                        )}
                      {(goal.status === "RELEASED" || goal.status === "CANCELLED") && (
                         <button 
                            onClick={() => openModal(goal, "archive")}
                            className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                         >
                            Archive
                             </button>
                          )}
                          </div>
                     </div>
                </div>
              );
           })}
        </div>
      )}

      {/* Modal Overlay */}
      {selectedGoal && modalMode && modalMode !== "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                   {modalMode === "contribute" && "Fund Goal"}
                   {modalMode === "release" && "Release Funds"}
                   
                   {modalMode === "delete" && "Delete Goal"}
                   {modalMode === "archive" && "Archive Goal"}
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

            {modalMode === "contribute" && (
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
            )}
            
            {modalMode === "release" && (
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
                     onClick={() => handleAction("/release")}
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

            {modalMode === "delete" && (
               <div className="space-y-4">
                  <p className="text-sm text-slate-600 text-center">
                     Are you sure you want to permanently delete this goal? This action cannot be undone.
                  </p>
                  <button 
                     onClick={() => handleAction("", "DELETE")}
                     disabled={isSubmitting}
                     className="w-full bg-red-600 text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm hover:bg-red-700"
                  >
                     {isSubmitting ? "Deleting..." : "Yes, Delete Goal"}
                  </button>
               </div>
            )}

            {modalMode === "archive" && (
               <div className="space-y-4">
                  <p className="text-sm text-slate-600 text-center">
                     Archive this goal? It will no longer appear in your active list.
                  </p>
                  <button 
                     onClick={() => handleAction("/archive")}
                     disabled={isSubmitting}
                     className="w-full bg-slate-800 text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm hover:bg-slate-900"
                  >
                     {isSubmitting ? "Archiving..." : "Archive Goal"}
                  </button>
               </div>
            )}
          </div>
        </div>
      )}

      {selectedGoal && modalMode === "edit" && (
        <GoalEditModal 
          isOpen={true} 
          onClose={closeModal} 
          goal={selectedGoal} 
          onSuccess={() => {
            loadData();
            closeModal();
          }} 
        />
      )}
    </div>
  );
}
















