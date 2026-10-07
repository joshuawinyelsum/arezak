"use client";

import React, { useState, useEffect } from "react";
import { Plus, Minus, ArrowLeftRight, X, AlertCircle, Loader2, PieChart, ArrowDownLeft, ArrowUpRight, ShoppingBag, ArrowRightLeft, Target, ShieldCheck, RefreshCw, CreditCard, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { FundAccountModal } from "@/components/FundAccountModal";
import { TransactionActionModal } from "@/components/TransactionActionModal";
import { Modal } from "@/components/ui/Modal";
import { mapTransaction, isCredit, isDebit } from "@/lib/transactions/mapper";


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
  direction?: "INCOMING" | "OUTGOING";
}

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [search, setSearch] = useState("");
  
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
    setError(null);
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
      if (process.env.NODE_ENV === "development") console.error("Transaction data load failed", err);
      setError("Transactions couldn’t be loaded. Try again.");
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
  const groupedTransactions = [...transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).reduce((acc, tx) => {
    const dateStr = new Date(tx.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Icon map keyed by mapper's iconName field
  const ICON_MAP: Record<string, React.ElementType> = {
    ArrowDownLeft, ArrowUpRight, ShoppingBag, ArrowRightLeft,
    Target, ShieldCheck, RefreshCw, CreditCard, PieChart,
  };

  const getIconForType = (type: string) => {
    const pres = mapTransaction(type);
    const Icon = ICON_MAP[pres.iconName] ?? CreditCard;
    return { Icon, bg: pres.bg, color: pres.color };
  };


  const filteredGroups = Object.entries(groupedTransactions).map(([date, txs]) => {
    const filteredTxs = txs.filter(tx => {
      const credit = isCredit(tx.type) || tx.direction === "INCOMING";
      const debit = isDebit(tx.type) || tx.direction === "OUTGOING";
      const matchesTab = activeTab === "all" || (activeTab === "income" && credit) || (activeTab === "expenses" && debit);
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || `${tx.description ?? ""} ${tx.note ?? ""} ${tx.funding_source ?? ""} ${mapTransaction(tx.type).label} ${tx.type}`.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
    return { date, txs: filteredTxs };
  }).filter(group => group.txs.length > 0);

  return (
    <div className="page-frame activity-page pb-12">
      
      {/* Header */}
      <header className="page-heading">
        <div><h1>Activity</h1></div>
          <div className="flex gap-2">
             <button 
               onClick={() => {
                 setAmountStr("");
                 setDescription("");
                 setModalError(null);
                 setIsExpenseModalOpen(true);
               }}
               className="action-button secondary-action"
               aria-label="Add Expense"
             >
               <Minus className="w-4 h-4 md:mr-1.5" />
               <span className="text-xs font-semibold">Expense</span>
             </button>
             <button 
               onClick={() => setShowFundModal(true)}
               className="action-button"
               aria-label="Fund Account"
             >
               <Plus className="w-4 h-4 md:mr-1.5" />
               <span className="text-xs font-semibold">Add money</span>
             </button>
          </div>
      </header>

      <label className="activity-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search activity</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" /></label>

      {/* Tabs */}
      <div className="activity-filters" aria-label="Filter activity">
         <span className="filter-symbol"><SlidersHorizontal size={14} /></span>
         {[
           { id: "all", label: "All" },
           { id: "income", label: "Income" },
           { id: "expenses", label: "Expenses" }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             aria-pressed={activeTab === tab.id}
             className={cn(
               "flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all",
               activeTab === tab.id 
                 ? "bg-brand text-brand-foreground shadow-sm" 
                 : "text-muted-foreground hover:text-card-foreground"
             )}
           >
             {tab.label}
           </button>
         ))}
      </div>

      {isLoading && (
        <div className="state-panel" role="status" aria-live="polite">
          <span className="state-symbol"><Loader2 className="animate-spin" /></span>
          <p className="section-kicker">ACTIVITY / SYNC</p><p className="text-sm font-semibold">Loading your activity</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="state-panel state-error" role="alert">
          <span className="state-symbol"><AlertCircle /></span>
          <p className="font-medium">Failed to load transactions</p>
          <p className="text-sm mt-1 opacity-80">{error}</p>
          <button 
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && filteredGroups.length === 0 && (
        <div className="state-panel mt-6">
          <PieChart className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No transactions</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">You don&apos;t have any transactions here yet.</p>
        </div>
      )}

      {/* Transaction List */}
      {!isLoading && !error && filteredGroups.length > 0 && (
        <div className="space-y-6 mt-6">
           {filteredGroups.map(group => (
              <div key={group.date}>
                 <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">{group.date}</h3>
                 <div className="space-y-1">
                    {group.txs.map(item => {
                       const { Icon, bg, color } = getIconForType(item.type);
                       const pres = mapTransaction(item.type);
                       const isPositive = pres.direction === "credit" || item.direction === "INCOMING";
                       // Primary label: user's description if present, else mapped label
                       const primaryLabel = item.description?.trim() || pres.label;
                       // Subtitle: mapped label (when description is the title), plus note
                       const subtitleLabel = item.description?.trim() ? pres.label : null;
                       
                       return (
                       <article key={item.id} className={`activity-entry ${isPositive ? "is-credit" : "is-debit"}`}>
                          <div className="flex items-center gap-4">
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg, color)}>
                                <Icon className="w-[18px] h-[18px]" />
                             </div>
                               <div className="min-w-0">
                                  <div className="font-semibold text-sm text-foreground truncate">{primaryLabel}</div>
                                  <div className="activity-meta">
                                    <span>{subtitleLabel || pres.label}</span>
                                    <span aria-hidden="true" className="activity-meta-dot" />
                                    <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleTimeString("en-GH", { hour: "numeric", minute: "2-digit" })}</time>
                                    {item.funding_source && <><span aria-hidden="true" className="activity-meta-dot" /><span className="truncate">{item.funding_source}</span></>}
                                    {item.note && <><span aria-hidden="true" className="activity-meta-dot" /><span className="truncate">{item.note}</span></>}
                                  </div>
                               </div>
                          </div>
                            <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
                               <div className={`activity-amount ${isPositive ? "is-credit" : "is-debit"}`}>
                                  {isPositive ? "+" : "-"} GH₵{formatPesewas(item.amount.amount_pesewas)}
                               </div>
                               {(item.type === "INCOME" || item.type === "EXPENSE") && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                      onClick={() => openActionModal(item, "metadata")} 
                                      className="text-xs bg-input hover:bg-muted-foreground/10 px-2 py-1 rounded text-muted-foreground font-medium"
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
                       </article>
                    )})}
                 </div>
              </div>
           ))}
        </div>
      )}

      {/* Modal Overlay */}
      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <Modal open ariaLabel="Record expense" onClose={() => { if (!isSubmitting) setIsExpenseModalOpen(false); }} closeOnBackdrop={!isSubmitting} panelClassName="goal-modal-panel">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Record Expense</h2>
              <button 
                onClick={() => { if (!isSubmitting) setIsExpenseModalOpen(false); }}
                disabled={isSubmitting}
                aria-label="Close expense dialog"
                className="text-muted-foreground hover:text-card-foreground transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="bg-destructive/10 text-destructive-foreground text-sm font-medium p-3 rounded-xl mb-4 text-center border border-destructive/20">
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
                <label htmlFor="expense-account" className="block text-sm font-semibold text-foreground mb-1.5">Account</label>
                <select 
                  id="expense-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all appearance-none"
                  disabled={isSubmitting}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense-amount" className="block text-sm font-semibold text-foreground mb-1.5">Amount (GH₵)</label>
                <input 
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  disabled={isSubmitting}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="expense-description" className="block text-sm font-semibold text-foreground mb-1.5">Description (Optional)</label>
                <input 
                  id="expense-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this for?"
                  disabled={isSubmitting}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  "Record Expense"
                )}
              </button>
            </form>
        </Modal>
      )}
      
      <FundAccountModal 
        isOpen={showFundModal} 
        onClose={() => setShowFundModal(false)} 
        accountId={accountId} 
        onSuccess={() => {
          loadData();
        }} 
      />

      <TransactionActionModal
        isOpen={!!actionModalTx}
        onClose={() => setActionModalTx(null)}
        transaction={actionModalTx}
        mode={actionModalMode}
        onSuccess={() => loadData()}
      />
    </div>
  );
}

