"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Target, ArrowDownCircle, ArrowUpCircle, X, AlertCircle, Laptop, Home, Shield, Plane } from "lucide-react";
import { icons } from "lucide-react";
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
  status: string;
  lock_type?: string;
  unlock_date?: string;
  is_eligible_for_release?: boolean;
  icon?: string;
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

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalMode, setModalMode] = useState<"contribute" | "release" | "edit" | "cancel" | "delete" | "archive" | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalRes, accRes] = await Promise.all([
        apiFetch(`/goals/${goalId}`),
        apiFetch("/accounts")
      ]);
      if (!goalRes.ok) throw new Error("Failed to load goal");
      
      const gData = await goalRes.json();
      const aData = await accRes.json();
      setGoal(gData);
      setAccounts(aData);
      if (aData.length > 0 && !accountId) {
        setAccountId(aData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [goalId, accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (mode: "contribute" | "release" | "edit" | "cancel" | "delete" | "archive") => {
    setModalMode(mode);
    setAmountStr("");
    setModalError(null);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setModalMode(null);
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || isSubmitting || !accountId) return;

    const amountFloat = parseFloat(amountStr);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setModalError("Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    const amountPesewas = Math.round(amountFloat * 100);

    try {
      const res = await apiFetch(`/goals/${goal.id}/contributions`, {
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
    if (!goal || isSubmitting) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiFetch(`/goals/${goal.id}${actionUrl}`, {
        method,
        headers: {
          "Idempotency-Key": crypto.randomUUID()
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || "Action failed.");
      }

      if (actionUrl === "" && method === "DELETE") {
         router.push("/goals");
         return;
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
    if (!goal || isSubmitting) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiFetch(`/goals/${goal.id}/release`, {
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-medium">Loading goal details...</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4">
         <Link href="/goals" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6">
           <ArrowLeft className="w-4 h-4" /> Back to Goals
         </Link>
         <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center text-center">
            <AlertCircle className="w-10 h-10 mb-2 opacity-80" />
            <h3 className="font-bold">Failed to load goal</h3>
            <p className="text-sm mt-1">{error}</p>
         </div>
      </div>
    );
  }

  let Icon = Target;
  let color = "text-brand";
  let bg = "bg-brand/10";
  
  if (goal.icon) {
    Icon = icons[goal.icon as keyof typeof icons] || Target;
  } else {
    const legacy = getIconForName(goal.name);
    Icon = legacy.icon;
    color = legacy.color;
    bg = legacy.bg;
  }

  const percentage = goal.target_amount > 0 ? Math.floor((goal.current_amount / goal.target_amount) * 100) : 0;
  const remainingAmount = Math.max(0, goal.target_amount - goal.current_amount);
  const isEligible = goal.is_eligible_for_release ?? (goal.status === "ACHIEVED");

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-4 pt-4">
      
      {/* Header */}
      <header className="flex items-center gap-3 py-2">
         <Link href="/goals" className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
           <ArrowLeft className="w-5 h-5 text-slate-700" />
         </Link>
         <h1 className="text-xl font-bold text-slate-900">Goal Details</h1>
      </header>

      {/* Main Card */}
      <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-200">
         <div className="flex flex-col items-center text-center mb-8">
            <div className={cn("w-16 h-16 rounded-[18px] flex items-center justify-center shrink-0 mb-4", bg, color)}>
               <Icon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{goal.name}</h2>
            
            <div className="flex gap-2 mt-2">
               {goal.status === "ACTIVE" && <span className="bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold">Active</span>}
               {goal.status === "ACHIEVED" && <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold">Achieved</span>}
               {goal.status === "RELEASED" && <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold">Released</span>}
               {goal.status === "ARCHIVED" && <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold">Archived</span>}
            </div>
         </div>

         {/* Financial Breakdown */}
         <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
               <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Locked Funds</div>
               <div className="text-xl font-bold text-blue-500">GH₵ {formatPesewas(goal.locked_amount)}</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
               <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Remaining to Target</div>
               <div className="text-xl font-bold text-slate-700">GH₵ {formatPesewas(remainingAmount)}</div>
            </div>
         </div>

         {/* Unlock Condition */}
         <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-8 flex items-center justify-between">
            <div>
               <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Unlock condition</div>
               <div className="text-sm font-bold text-slate-700">
                  {goal.lock_type === "TARGET_REACHED" || !goal.lock_type ? "When target is reached" : 
                   goal.lock_type === "DATE_REACHED" && goal.unlock_date ? `Unlock date: ${new Date(goal.unlock_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : "When target is reached"}
               </div>
            </div>
            {isEligible && goal.status !== "RELEASED" && goal.status !== "ARCHIVED" && (
               <div className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold">Eligible for Release</div>
            )}
         </div>

         {/* Progress Bar */}
         <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
               <div>
                  <div className="text-sm font-medium text-slate-500 mb-0.5">Saved Amount</div>
                  <div className="text-2xl font-bold text-slate-900">GH₵ {formatPesewas(goal.current_amount)} <span className="text-base text-slate-400 font-normal">/ GH₵ {formatPesewas(goal.target_amount)}</span></div>
               </div>
               <div className="text-xl font-bold text-brand">{percentage}%</div>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
               <div 
                 className={cn("h-full rounded-full transition-all duration-1000", goal.status === "RELEASED" || goal.status === "ARCHIVED" ? "bg-slate-300" : "bg-brand")}
                 style={{ width: `${Math.min(percentage, 100)}%` }}
               />
            </div>
         </div>

         {/* Primary Actions */}
         <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
            {goal.status === "ACTIVE" && (
               <>
                 <button 
                    onClick={() => openModal("contribute")}
                    className="flex-1 flex items-center justify-center gap-2 bg-brand text-white py-3.5 rounded-xl font-semibold hover:bg-brand/90 transition-all shadow-sm"
                 >
                    <ArrowDownCircle className="w-5 h-5" /> Fund Goal
                 </button>
               </>
            )}
            
            {isEligible && goal.status !== "RELEASED" && goal.status !== "ARCHIVED" && (
               <button 
                  onClick={() => openModal("release")}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3.5 rounded-xl font-semibold hover:bg-green-600 transition-all shadow-sm"
               >
                  <ArrowUpCircle className="w-5 h-5" /> Release Funds
               </button>
            )}
         </div>
      </div>
      
      {/* Secondary Actions */}
      <div className="flex flex-wrap justify-center gap-4 mt-6">
         {goal.status === "ACTIVE" && (
            <>
               <button onClick={() => openModal("edit")} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Edit Goal</button>
               {goal.current_amount === 0 ? (
                  <button onClick={() => openModal("delete")} className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors">Delete Goal</button>
               ) : (
                  <button onClick={() => openModal("cancel")} className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors">Cancel Goal</button>
               )}
            </>
         )}
         {(goal.status === "RELEASED" || goal.status === "CANCELLED") && (
            <button onClick={() => openModal("archive")} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Archive Goal</button>
         )}
      </div>

      {/* Modal Overlay */}
      {modalMode && modalMode !== "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                   {modalMode === "contribute" && "Fund Goal"}
                   {modalMode === "release" && "Release Funds"}
                   {modalMode === "cancel" && "Cancel Goal"}
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
                     <p className="text-xs text-slate-500 mb-1">Target: GH₵{formatPesewas(goal.target_amount)}</p>
                     <p className="text-lg font-bold text-brand">Current: GH₵{formatPesewas(goal.current_amount)}</p>
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
                     <label className="block text-sm font-semibold text-slate-900 mb-1.5">Amount to Fund</label>
                     <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GH₵</span>
                        <input
                           type="number"
                           step="0.01"
                           min="0.01"
                           value={amountStr}
                           onChange={(e) => setAmountStr(e.target.value)}
                           disabled={isSubmitting}
                           placeholder="0.00"
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50"
                           required
                        />
                     </div>
                  </div>

                  <button 
                     type="submit"
                     disabled={isSubmitting || !amountStr}
                     className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm shadow-brand/20 hover:bg-brand/90"
                  >
                     {isSubmitting ? "Funding..." : "Confirm Funding"}
                  </button>
               </form>
            )}

            {modalMode === "release" && (
               <div className="space-y-4">
                  <p className="text-sm text-slate-600 text-center font-medium">
                     You are about to release:
                  </p>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                     <span className="text-2xl font-bold text-green-600">GH₵{formatPesewas(goal.locked_amount)}</span>
                  </div>
                  <p className="text-sm text-slate-600 text-center">
                     from this Goal. The money will become available to spend again. This will move the Goal from:
                  </p>
                  <p className="text-center font-bold text-slate-900 text-sm">{goal.status} → RELEASED</p>
                  
                  <button 
                     onClick={handleRelease}
                     disabled={isSubmitting}
                     className="w-full bg-green-500 text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm hover:bg-green-600"
                  >
                     {isSubmitting ? "Releasing..." : `Release GH₵${formatPesewas(goal.locked_amount)}`}
                  </button>
               </div>
            )}

            {modalMode === "cancel" && (
               <div className="space-y-4">
                  <p className="text-sm text-slate-600 text-center">
                     Are you sure you want to cancel this goal? Any locked funds will be returned to your available balance.
                  </p>
                  <button 
                     onClick={() => handleAction("/cancel")}
                     disabled={isSubmitting}
                     className="w-full bg-orange-500 text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm hover:bg-orange-600"
                  >
                     {isSubmitting ? "Cancelling..." : "Cancel Goal & Return Funds"}
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

      {modalMode === "edit" && (
        <GoalEditModal 
          isOpen={true} 
          onClose={closeModal} 
          goal={goal} 
          onSuccess={() => {
            loadData();
            closeModal();
          }} 
        />
      )}
    </div>
  );
}







