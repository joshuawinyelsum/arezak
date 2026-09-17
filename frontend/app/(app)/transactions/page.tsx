"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Minus, ArrowLeftRight, X, AlertCircle, Loader2, PieChart, ShieldCheck, ArrowLeft, Wifi, Briefcase, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { FundAccountModal } from "@/components/FundAccountModal";
import { TransactionActionModal } from "@/components/TransactionActionModal";

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: { amount_pesewas: number; currency: string };
  status: string;
  created_at: string;
  description: string;
  funding_source?: string;
  note?: string;
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Fund Account Modal State
  const [showFundModal, setShowFundModal] = useState(false);

  // Action Modal State
  const [actionModalTx, setActionModalTx] = useState<Transaction | null>(null);
  const [actionModalMode, setActionModalMode] = useState<"correct" | "metadata" | null>(null);
  const openActionModal = (tx: Transaction, mode: "correct" | "metadata") => {
    setActionModalTx(tx);
    setActionModalMode(mode);
  };

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [txRes, accRes] = await Promise.all([
        apiFetch("/transactions"),
        apiFetch("/accounts")
      ]);
      const txData = await txRes.json();
      const accData = await accRes.json();
      setTransactions(txData);
      setAccounts(accData);
      if (accData.length > 0 && !accountId) {
        setAccountId(accData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatPesewas = (pesewas: number) => {
    return (pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Group transactions by date string
  const groupedTransactions = transactions.reduce((acc, tx) => {
    const dateStr = new Date(tx.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const getIconForType = (type: string) => {
    if (type === "INCOME") return { Icon: Briefcase, bg: "bg-green-50", color: "text-green-600" };
    if (type === "EXPENSE") return { Icon: PieChart, bg: "bg-slate-100", color: "text-slate-600" };
    if (type === "GOAL_RELEASE") return { Icon: Briefcase, bg: "bg-brand/10", color: "text-brand" };
    return { Icon: Wifi, bg: "bg-slate-100", color: "text-slate-500" };
  };

  const filteredGroups = Object.entries(groupedTransactions).map(([date, txs]) => {
    const filteredTxs = txs.filter(tx => {
      if (activeTab === "all") return true;
      if (activeTab === "income") return tx.type === "INCOME" || tx.type === "GOAL_RELEASE";
      if (activeTab === "expenses") return tx.type === "EXPENSE";
      return true;
    });
    return { date, txs: filteredTxs };
  }).filter(group => group.txs.length > 0);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div className="flex items-center gap-3">
           <Link href="/" className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-700" />
           </Link>
           <h1 className="text-xl md:text-2xl font-bold text-slate-900">Transactions</h1>
        </div>
          <div className="flex gap-2">
             <button 
               onClick={() => {
                 setAmountStr("");
                 setDescription("");
                 setModalError(null);
                 setIsExpenseModalOpen(true);
               }}
               className="flex items-center justify-center w-8 h-8 md:w-auto md:px-3 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shadow-sm"
               aria-label="Add Expense"
             >
               <Minus className="w-4 h-4 md:mr-1.5" />
               <span className="hidden md:inline text-sm font-semibold">Expense</span>
             </button>
             <button 
               onClick={() => setShowFundModal(true)}
               className="flex items-center justify-center w-8 h-8 md:w-auto md:px-3 rounded-full bg-brand text-white hover:bg-brand/90 transition-colors shadow-sm"
               aria-label="Fund Account"
             >
               <Plus className="w-4 h-4 md:mr-1.5" />
               <span className="hidden md:inline text-sm font-semibold">Fund Account</span>
             </button>
          </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
         {[
           { id: "all", label: "All" },
           { id: "income", label: "Income" },
           { id: "expenses", label: "Expenses" }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={cn(
               "flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all",
               activeTab === tab.id 
                 ? "bg-brand text-white shadow-sm" 
                 : "text-slate-500 hover:text-slate-700"
             )}
           >
             {tab.label}
           </button>
         ))}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-sm font-medium">Loading transactions...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center text-center">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="font-medium">Failed to load transactions</p>
          <p className="text-sm mt-1 opacity-80">{error}</p>
          <button 
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && filteredGroups.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 p-10 rounded-2xl flex flex-col items-center text-center mt-6">
          <PieChart className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No transactions</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">You don&apos;t have any transactions here yet.</p>
        </div>
      )}

      {/* Transaction List */}
      {!isLoading && !error && filteredGroups.length > 0 && (
        <div className="space-y-6 mt-6">
           {filteredGroups.map(group => (
              <div key={group.date}>
                 <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">{group.date}</h3>
                 <div className="space-y-1">
                    {group.txs.map(item => {
                       const { Icon, bg, color } = getIconForType(item.type);
                       const isPositive = item.type === "INCOME" || item.type === "GOAL_RELEASE";
                       
                       return (
                       <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-4">
                             <div className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", bg, color)}>
                                <Icon className="w-5 h-5" />
                             </div>
                             <div>
                                <div className="font-semibold text-sm text-slate-900 capitalize">{item.description || item.type.toLowerCase().replace("_", " ")}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5 capitalize">{item.type.toLowerCase().replace("_", " ")}</div>
                             </div>
                          </div>
                            <div className="flex flex-col items-end gap-2">
                               <div className={cn(
                                  "font-semibold text-sm",
                                  isPositive ? "text-green-600" : "text-slate-900"
                               )}>
                                  {isPositive ? "+" : "-"} GH₵{formatPesewas(item.amount.amount_pesewas)}
                               </div>
                               {(item.type === "INCOME" || item.type === "EXPENSE") && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                      onClick={() => openActionModal(item, "metadata")} 
                                      className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 font-medium"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => openActionModal(item, "correct")} 
                                      className="text-xs bg-brand/10 hover:bg-brand/20 px-2 py-1 rounded text-brand font-medium"
                                    >
                                      Correct
                                    </button>
                                  </div>
                               )}
                            </div>
                       </div>
                    )})}
                 </div>
              </div>
           ))}
        </div>
      )}

      {/* Modal Overlay */}
      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Record Expense</h2>
              <button 
                onClick={() => { if (!isSubmitting) setIsExpenseModalOpen(false); }}
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

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!accountId || !amountStr || isSubmitting) return;
          
              setIsSubmitting(true);
              setModalError(null);
          
              const amountFloat = parseFloat(amountStr);
              if (isNaN(amountFloat) || amountFloat <= 0) {
                setModalError("Please enter a valid positive amount.");
                setIsSubmitting(false);
                return;
              }
          
              const amountPesewas = Math.round(amountFloat * 100);
          
              const payload = {
                account_id: accountId,
                amount: { amount_pesewas: amountPesewas, currency: accounts.find(a => a.id === accountId)?.currency || "GHS" },
                description: description || "Expense"
              };
          
              try {
                const res = await apiFetch("/transactions/expense", {
                  method: "POST",
                  body: JSON.stringify(payload)
                });
                if (!res.ok) {
                  const errData = await res.json();
                  throw new Error(errData.detail?.message || errData.detail || "Failed to record expense");
                }
                await loadData();
                setIsExpenseModalOpen(false);
              } catch (err: any) {
                setModalError(err.message || "An unexpected error occurred.");
              } finally {
                setIsSubmitting(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Account</label>
                <select 
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all appearance-none"
                  disabled={isSubmitting}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
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

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Description (Optional)</label>
                <input 
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this for?"
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:bg-slate-800"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  "Record Expense"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
