import os
with open('frontend/app/(app)/goals/page.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write("""\"use client\";

import React, { useState, useEffect } from \"react\";
import Link from \"next/link\";
import { ArrowLeft, Laptop, Home, Shield, Plane, Wallet, Loader2, AlertCircle, Target, ArrowDownCircle, ArrowUpCircle, X } from \"lucide-react\";
import { Icon } from \"@/components/Icon\";
import { cn } from \"@/lib/utils\";
import { apiFetch } from \"@/lib/api\";
import { GoalEditModal } from \"@/components/GoalEditModal\";

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

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState(\"active\");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [modalMode, setModalMode] = useState<\"contribute\" | \"release\" | \"edit\" | \"delete\" | null>(null);
  const [amountStr, setAmountStr] = useState(\"\");
  const [accountId, setAccountId] = useState(\"\");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalsRes, accRes] = await Promise.all([
        apiFetch(\"/goals\"),
        apiFetch(\"/accounts\")
      ]);
      const gData = await goalsRes.json();
      const aData = await accRes.json();
      setGoals(gData);
      setAccounts(aData);
      if (aData.length > 0 && !accountId) {
        setAccountId(aData[0].id);
      }
    } catch (err: any) {
      setError(err.message || \"Failed to load data.\");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (goal: Goal, mode: \"contribute\" | \"release\" | \"edit\" | \"delete\") => {
    setSelectedGoal(goal);
    setModalMode(mode);
    setAmountStr(\"\");
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
      setModalError(\"Please enter a valid amount.\");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    const amountPesewas = Math.round(amountFloat * 100);

    try {
      const res = await apiFetch(`/goals/${selectedGoal.id}/contributions`, {
        method: \"POST\",
        headers: {
          \"Idempotency-Key\": crypto.randomUUID()
        },
        body: JSON.stringify({ amount: amountPesewas, account_id: accountId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || \"Contribution failed.\");
      }

      await loadData();
      closeModal();
    } catch (err: any) {
      setModalError(err.message || \"An unexpected error occurred.\");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (actionUrl: string, method: string = \"POST\") => {
    if (!selectedGoal || isSubmitting) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiFetch(`/goals/${selectedGoal.id}${actionUrl}`, {
        method,
        headers: {
          \"Idempotency-Key\": crypto.randomUUID()
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || \"Action failed.\");
      }

      await loadData();
      closeModal();
    } catch (err: any) {
      setModalError(err.message || \"Action failed.\");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPesewas = (pesewas: number) => {
    return (pesewas / 100).toLocaleString(\"en-US\", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Process Tabs
  const sortedGoals = [...goals].sort((a, b) => new Date(b.created_at || \"1970-01-01\").getTime() - new Date(a.created_at || \"1970-01-01\").getTime());
  
  const activeGoals = sortedGoals.filter(g => g.status === \"ACTIVE\" || g.status === \"ACHIEVED\");
  const completedGoals = sortedGoals.filter(g => g.status === \"RELEASED\" || g.status === \"CANCELLED\" || g.status === \"ARCHIVED\");
  
  const filteredGoals = activeTab === \"active\" ? activeGoals : completedGoals;

  const tabs = [
     { id: \"active\", label: `Active goals (${activeGoals.length})` },
     { id: \"completed\", label: `Completed goals (${completedGoals.length})` }
  ];

  return (
    <div className=\"w-full max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12\">
      <div className=\"flex flex-col md:flex-row gap-4 md:items-center justify-between md:mt-4\">
        <div>
          <div className=\"flex items-center gap-3 mb-1\">
             <Link href=\"/\" className=\"md:hidden text-slate-400 hover:text-slate-600 transition-colors\">
               <ArrowLeft className=\"w-5 h-5\" />
             </Link>
             <h1 className=\"text-[22px] md:text-2xl font-bold text-slate-900 tracking-tight\">Your goals</h1>
          </div>
        </div>
        <Link 
           href=\"/goals/create\" 
           className=\"flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-hover shadow-sm transition-colors w-full md:w-auto justify-center\"
        >
           + Create Goal
        </Link>
      </div>

      {/* Tabs */}
      <div className=\"flex items-center gap-6 border-b border-slate-200 overflow-x-auto no-scrollbar\">
         {tabs.map(tab => (
            <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                  \"py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap\",
                  activeTab === tab.id 
                     ? \"border-brand text-brand\" 
                     : \"border-transparent text-slate-500 hover:text-slate-700\"
               )}
            >
               {tab.label}
            </button>
         ))}
      </div>

      {error ? (
         <div className=\"bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center justify-center border border-red-100\">
            <AlertCircle className=\"w-8 h-8 mb-3\" />
            <div className=\"font-semibold\">{error}</div>
            <button onClick={loadData} className=\"mt-4 px-4 py-2 bg-white rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 transition-colors\">Try Again</button>
         </div>
      ) : isLoading ? (
         <div className=\"flex flex-col items-center justify-center py-20 text-slate-400\">
            <Loader2 className=\"w-8 h-8 animate-spin mb-4\" />
            <p className=\"text-sm font-medium\">Loading goals...</p>
         </div>
      ) : filteredGoals.length === 0 ? (
         <div className=\"bg-white border border-slate-200 rounded-[24px] p-12 flex flex-col items-center justify-center text-center shadow-sm\">
            <div className=\"w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4\">
               <Target className=\"w-8 h-8 text-slate-400\" />
            </div>
            <h3 className=\"text-lg font-bold text-slate-900 mb-2\">No goals yet</h3>
            <p className=\"text-slate-500 max-w-sm mb-6\">Create a goal to start protecting money for something that matters to you.</p>
            <Link href=\"/goals/create\" className=\"bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-hover transition-colors shadow-sm\">Create a goal</Link>
         </div>
      ) : (
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6\">
           {filteredGoals.map(goal => {
              const percentage = goal.target_amount > 0 ? Math.floor((goal.current_amount / goal.target_amount) * 100) : 0;
              
              return (
                <div key={goal.id} className=\"bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between\">
                     <div>
                          <div className=\"flex items-center justify-between mb-5\">
                             <div className=\"flex items-center gap-3\">
                                <div className=\"w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center\">
                                   <Icon name={goal.icon || \"Target\"} className=\"w-5 h-5\" />
                                </div>
                                <div>
                                   <Link href={`/goals/${goal.id}`} className=\"font-bold text-slate-900 hover:text-brand transition-colors text-lg inline-flex items-center gap-1 group-hover:underline\">
                                      {goal.name}
                                   </Link>
                                </div>
                             </div>
                             
                             <div>
                                {goal.status === \"ACTIVE\" && <span className=\"bg-blue-50 text-blue-600 text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-bold\">Saving</span>}
                                {goal.status === \"ACHIEVED\" && <span className=\"bg-green-50 text-green-600 text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-bold\">Target reached</span>}
                                {(goal.status === \"RELEASED\" || goal.status === \"ARCHIVED\" || goal.status === \"CANCELLED\") && <span className=\"bg-slate-100 text-slate-500 text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-bold\">Completed</span>}
                             </div>
                          </div>

                          <div className=\"flex justify-between items-end mb-2\">
                             <div>
                                <div className=\"text-[10px] text-slate-400 font-semibold uppercase tracking-wider\">Protected</div>
                                <div className=\"text-xl font-bold text-slate-900\">GH₵{formatPesewas(goal.current_amount)}</div>
                             </div>
                             <div className=\"text-right\">
                                <div className=\"text-[10px] text-slate-400 font-semibold uppercase tracking-wider\">Target</div>
                                <div className=\"text-sm font-semibold text-slate-600\">GH₵{formatPesewas(goal.target_amount)}</div>
                             </div>
                          </div>
                          
                          <div className=\"w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2\">
                             <div 
                                className={cn(\"h-full rounded-full transition-all duration-1000\", goal.status === \"ACHIEVED\" ? \"bg-green-500\" : \"bg-brand\")}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                             ></div>
                          </div>
                          <div className=\"text-xs text-slate-500 font-medium\">{percentage}% protected</div>
                     </div>
                     
                     <div className=\"mt-6 pt-5 border-t border-slate-100 flex items-center gap-2\">
                          <Link 
                             href={`/goals/${goal.id}`}
                             className=\"flex-1 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors\"
                          >
                             View details
                          </Link>
                          
                          {goal.status === \"ACTIVE\" && (
                             <button 
                                onClick={() => openModal(goal, \"contribute\")}
                                className=\"flex-1 flex items-center justify-center gap-1.5 bg-brand/10 text-brand py-2.5 rounded-xl text-sm font-semibold hover:bg-brand/20 transition-colors\"
                             >
                                Add money
                             </button>
                          )}
                          
                          {goal.status === \"ACHIEVED\" && (
                             <button 
                                onClick={() => openModal(goal, \"release\")}
                                className=\"flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors\"
                             >
                                Move to available
                             </button>
                          )}

                          {goal.status === \"ACTIVE\" && goal.current_amount === 0 && (
                             <button 
                                onClick={() => openModal(goal, \"delete\")}
                                className=\"flex items-center justify-center gap-1.5 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors\"
                                title=\"Delete goal\"
                             >
                                <X className=\"w-4 h-4\" />
                             </button>
                          )}
                     </div>
                </div>
              );
           })}
        </div>
      )}

      {/* Modal Overlay */}
      {selectedGoal && modalMode && modalMode !== \"edit\" && (
        <div className=\"fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in\">
          <div className=\"bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 relative\">
            <div className=\"flex justify-between items-center mb-6\">
                <h2 className=\"text-xl font-bold text-slate-900\">
                   {modalMode === \"contribute\" && \"Add money\"}
                   {modalMode === \"release\" && \"Move to available\"}
                   {modalMode === \"delete\" && \"Delete goal\"}
                </h2>
              <button 
                onClick={closeModal}
                disabled={isSubmitting}
                className=\"text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50\"
              >
                <X className=\"w-5 h-5\" />
              </button>
            </div>

            {modalError && (
              <div className=\"bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl mb-4 text-center border border-red-100 flex items-center justify-center gap-2\">
                <AlertCircle className=\"w-4 h-4\" />
                {modalError}
              </div>
            )}

            {modalMode === \"contribute\" && (
               <form onSubmit={handleContribute} className=\"space-y-4\">
                  <div className=\"bg-slate-50 rounded-xl p-4 text-center border border-slate-100\">
                     <p className=\"text-xs text-slate-500 mb-1\">Target: GH₵{formatPesewas(selectedGoal.target_amount)}</p>
                     <p className=\"text-lg font-bold text-brand\">Protected: GH₵{formatPesewas(selectedGoal.current_amount)}</p>
                  </div>

                  <div>
                     <label className=\"block text-sm font-semibold text-slate-900 mb-1.5\">From Account</label>
                     <select 
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        disabled={isSubmitting || accounts.length === 0}
                        className=\"w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50\"
                        required
                     >
                        {accounts.map(acc => (
                           <option key={acc.id} value={acc.id}>{acc.name} (GH₵{formatPesewas(acc.available_balance.amount_pesewas)} available)</option>
                        ))}
                     </select>
                  </div>

                  <div>
                     <label className=\"block text-sm font-semibold text-slate-900 mb-1.5\">Amount (GH₵)</label>
                     <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        placeholder=\"0.00\"
                        disabled={isSubmitting}
                        className=\"w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50\"
                        required
                     />
                  </div>

                  <button 
                     type=\"submit\"
                     disabled={isSubmitting}
                     className=\"w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:bg-brand/90\"
                  >
                     {isSubmitting ? (
                        <><Loader2 className=\"w-4 h-4 animate-spin\" /> Adding...</>
                     ) : (
                        \"Add money\"
                     )}
                  </button>
               </form>
            )}
            
            {modalMode === \"release\" && (
               <div className=\"space-y-4\">
                  <p className=\"text-sm text-slate-600\">
                     This will complete your <strong>{selectedGoal.name}</strong> goal and make <strong>GH₵{formatPesewas(selectedGoal.locked_amount)}</strong> available to spend.
                  </p>

                  <div className=\"flex flex-col gap-2 mt-4\">
                     <button 
                        onClick={() => handleAction(\"/release\")}
                        disabled={isSubmitting}
                        className=\"w-full bg-brand text-white font-semibold rounded-xl py-3.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:bg-brand/90\"
                     >
                        {isSubmitting ? \"Moving...\" : \"Move to available\"}
                     </button>
                     <button 
                        onClick={closeModal}
                        disabled={isSubmitting}
                        className=\"w-full bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl py-3.5 transition-all hover:bg-slate-50\"
                     >
                        Keep protected
                     </button>
                  </div>
               </div>
            )}

            {modalMode === \"delete\" && (
               <div className=\"space-y-4\">
                  <p className=\"text-sm text-slate-600 text-center\">
                     Are you sure you want to permanently delete this goal? This action cannot be undone.
                  </p>
                  <button 
                     onClick={() => handleAction(\"\", \"DELETE\")}
                     disabled={isSubmitting}
                     className=\"w-full bg-red-600 text-white font-semibold rounded-xl py-3.5 mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm hover:bg-red-700\"
                  >
                     {isSubmitting ? \"Deleting...\" : \"Delete goal\"}
                  </button>
               </div>
            )}
          </div>
        </div>
      )}

      {selectedGoal && modalMode === \"edit\" && (
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
""")
