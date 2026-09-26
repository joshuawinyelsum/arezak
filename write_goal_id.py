import os

with open('frontend/app/(app)/goals/[id]/page.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(r'''"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Target, ArrowDownCircle, ArrowUpCircle, X, AlertCircle, Laptop, Home, Shield, Plane } from "lucide-react";
import { Icon as DynamicIcon } from "@/components/Icon";
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

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalMode, setModalMode] = useState<"contribute" | "release" | "edit" | "delete" | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalRes, accRes] = await Promise.all([
        apiFetch(/goals/),
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

  const openModal = (mode: "contribute" | "release" | "edit" | "delete") => {
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
      const res = await apiFetch(/goals//contributions, {
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
      const res = await apiFetch(/goals/, {
        method,
        headers: {
          "Idempotency-Key": crypto.randomUUID()
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || "Action failed.");
      }

      if (method === "DELETE" || actionUrl === "/archive") {
         router.push("/goals");
      } else {
         await loadData();
         closeModal();
      }
    } catch (err: any) {
      setModalError(err.message || "Action failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPesewas = (pesewas: number) => {
    return (pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-medium">Loading goal...</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 pt-8">
        <Link href="/goals" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Goals
        </Link>
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center justify-center border border-red-100">
          <AlertCircle className="w-8 h-8 mb-3" />
          <div className="font-semibold">{error || "Goal not found"}</div>
          <Link href="/goals" className="mt-4 px-4 py-2 bg-white rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 transition-colors">Return to Goals</Link>
        </div>
      </div>
    );
  }

  const percentage = goal.target_amount > 0 ? Math.floor((goal.current_amount / goal.target_amount) * 100) : 0;
  const isEligible = goal.is_eligible_for_release || goal.status === "ACHIEVED";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between md:mt-4">
        <div>
          <Link href="/goals" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Goals
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <DynamicIcon name={goal.icon || "Target"} className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-[24px] md:text-3xl font-bold text-slate-900 tracking-tight">{goal.name}</h1>
             </div>
          </div>
        </div>
        
        <div className="flex gap-2">
           <button 
              onClick={() => openModal("edit")}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
           >
              Edit Goal
           </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
               <div>
                  {goal.status === "ACTIVE" && <span className="bg-blue-50 text-blue-600 text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-bold">Saving</span>}
                  {goal.status === "ACHIEVED" && <span className="bg-green-50 text-green-600 text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-bold">Target reached</span>}
                  {(goal.status === "RELEASED" || goal.status === "ARCHIVED" || goal.status === "CANCELLED") && <span className="bg-slate-100 text-slate-500 text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-bold">Completed</span>}
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
               <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Protected</div>
                  <div className="text-xl font-bold text-slate-900">GH₵{formatPesewas(goal.current_amount)}</div>
               </div>
               <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Target</div>
                  <div className="text-xl font-bold text-slate-600">GH₵{formatPesewas(goal.target_amount)}</div>
               </div>
            </div>
         </div>

         <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
               <span className="font-semibold text-slate-900">{percentage}% Protected</span>
               <span className="text-slate-500 font-medium">GH₵{formatPesewas(goal.target_amount - goal.current_amount)} remaining</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
               <div 
                  className={cn("h-full rounded-full transition-all duration-1000", goal.status === "ACHIEVED" ? "bg-green-500" : "bg-brand", goal.status === "RELEASED" || goal.status === "ARCHIVED" ? "bg-slate-300" : "")}
                  style={{ width: ${Math.min(percentage, 100)}% }}
               ></div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
         {goal.status === "ACTIVE" && (
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center justify-center space-y-4">
               <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                  <ArrowDownCircle className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-slate-900">Add money</h3>
                  <p className="text-sm text-slate-500 mt-1">Move money from your available balance to protect it for this goal.</p>
               </div>
               <button 
                  onClick={() => openModal("contribute")}
                  className="w-full bg-brand text-white font-semibold rounded-xl py-3 mt-2 transition-all hover:bg-brand-hover shadow-sm"
               >
                  Add money
               </button>
            </div>
         )}

         {isEligible && goal.status !== "RELEASED" && goal.status !== "ARCHIVED" && (
            <div className="bg-white border border-green-200 rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center justify-center space-y-4 ring-1 ring-green-500/20">
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <ArrowUpCircle className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-green-900">Move to available</h3>
                  <p className="text-sm text-green-700/80 mt-1">You've reached your target. Your money is still protected.</p>
               </div>
               <button 
                  onClick={() => openModal("release")}
                  className="w-full bg-green-500 text-white font-semibold rounded-xl py-3 mt-2 transition-all hover:bg-green-600 shadow-sm"
               >
                  Move to available
               </button>
            </div>
         )}
         
         <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-6 shadow-inner flex flex-col justify-center">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-slate-400"/> Goal Rules</h3>
            <ul className="space-y-3 text-sm text-slate-600">
               <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
                  <span>This goal is locked until the target amount is reached.</span>
               </li>
               <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
                  <span>Target amount is strictly fixed and cannot be changed.</span>
               </li>
            </ul>

            {goal.status === "ACTIVE" && goal.current_amount === 0 && (
               <div className="mt-6 pt-4 border-t border-slate-200">
                  <button onClick={() => openModal("delete")} className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5">
                     <X className="w-4 h-4" /> Delete goal
                  </button>
               </div>
            )}
         </div>
      </div>

      {/* Modal Overlay */}
      {modalMode && modalMode !== "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                   {modalMode === "contribute" && "Add money"}
                   {modalMode === "release" && "Move to available"}
                   {modalMode === "delete" && "Delete goal"}
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
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl mb-4 text-center border border-red-100 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {modalError}
              </div>
            )}

            {modalMode === "contribute" && (
               <form onSubmit={handleContribute} className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                     <p className="text-xs text-slate-500 mb-1">Target: GH₵{formatPesewas(goal.target_amount)}</p>
                     <p className="text-lg font-bold text-brand">Protected: GH₵{formatPesewas(goal.current_amount)}</p>
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
                        <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                     ) : (
                        "Add money"
                     )}
                  </button>
               </form>
            )}
            
            {modalMode === "release" && (
               <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                     This will complete your <strong>{goal.name}</strong> goal and make <strong>GH₵{formatPesewas(goal.locked_amount)}</strong> available to spend.
                  </p>

                  <div className="flex flex-col gap-2 mt-4">
                     <button 
                        onClick={() => handleAction("/release")}
                        disabled={isSubmitting}
                        className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:bg-brand/90"
                     >
                        {isSubmitting ? "Moving..." : "Move to available"}
                     </button>
                     <button 
                        onClick={closeModal}
                        disabled={isSubmitting}
                        className="w-full bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl py-3.5 transition-all hover:bg-slate-50"
                     >
                        Keep protected
                     </button>
                  </div>
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
                     {isSubmitting ? "Deleting..." : "Delete goal"}
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
''')
