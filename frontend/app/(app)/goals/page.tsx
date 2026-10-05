"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Target, Loader2, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatPesewas } from "@/lib/money/format";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked_amount: number;
  status: string;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ACHIEVED" | "DELETED">("ACTIVE");

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch("/goals");
      if (!res.ok) throw new Error("Failed to load goals");
      setGoals(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { id: "ACTIVE", label: "In Progress" },
    { id: "ACHIEVED", label: "Achieved" },
    { id: "DELETED", label: "Deleted" }
  ] as const;

  const filteredGoals = goals.filter(g => g.status === activeTab);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between md:mt-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <Link href="/" className="md:hidden text-muted-foreground hover:text-foreground transition-colors">
               <ArrowLeft className="w-5 h-5" />
             </Link>
             <h1 className="text-[22px] md:text-2xl font-bold text-foreground tracking-tight">Your goals</h1>
          </div>
        </div>
        <Link 
           href="/goals/create" 
           className="flex items-center gap-2 bg-brand text-brand-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand/90 shadow-sm transition-colors w-full md:w-auto justify-center"
        >
           + Create Goal
        </Link>
      </div>

      <div className="flex items-center gap-6 border-b border-border overflow-x-auto no-scrollbar">
         {tabs.map(tab => (
            <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                  "py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id 
                     ? "border-brand text-brand" 
                     : "border-transparent text-muted-foreground hover:text-foreground"
               )}
            >
               {tab.label} ({goals.filter(g => g.status === tab.id).length})
            </button>
         ))}
      </div>

      <main>
        {error ? (
          <div className="bg-destructive/10 text-destructive-foreground p-6 rounded-2xl flex flex-col items-center justify-center border border-destructive/20">
            <AlertCircle className="w-8 h-8 mb-3" />
            <div className="font-semibold text-center">{error}</div>
            <button onClick={loadData} className="mt-4 px-4 py-2 bg-background border border-border rounded-xl text-sm font-medium shadow-sm hover:bg-muted transition-colors">Try Again</button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm font-medium">Loading goals...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="bg-card border border-border rounded-[24px] p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-input rounded-full flex items-center justify-center mb-4">
               <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No goals yet</h3>
            <p className="text-muted-foreground text-sm max-w-[250px] mb-6">
              Create a goal to start protecting money for the things you want to achieve.
            </p>
            {activeTab === "ACTIVE" && (
               <Link 
                  href="/goals/create" 
                  className="px-6 py-2.5 bg-brand text-brand-foreground rounded-xl text-sm font-medium hover:bg-brand/90 transition-colors shadow-sm"
               >
                  Create your first goal
               </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filteredGoals.map(goal => {
               const progress = goal.target_amount > 0 ? Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100) : 0;
               return (
                  <Link 
                     key={goal.id} 
                     href={/goals/}
                     className="bg-card border border-border rounded-2xl p-5 hover:border-brand/50 transition-colors group block relative overflow-hidden shadow-sm"
                  >
                     <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="bg-input w-10 h-10 rounded-xl flex items-center justify-center text-xl">
                           🎯
                        </div>
                        <div className="text-right">
                           <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target</div>
                           <div className="font-bold text-foreground">{formatPesewas(goal.target_amount)}</div>
                        </div>
                     </div>

                     <div className="relative z-10">
                        <h3 className="font-semibold text-foreground text-base mb-1 group-hover:text-brand transition-colors line-clamp-1">{goal.name}</h3>
                        <div className="text-sm font-medium text-foreground mb-4">
                           {formatPesewas(goal.current_amount)} <span className="text-muted-foreground font-normal text-xs ml-1">saved</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                           <span>Progress</span>
                           <span className={progress >= 100 ? "text-success-foreground" : "text-brand"}>{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-input rounded-full overflow-hidden">
                           <div 
                              className={cn(
                                 "h-full rounded-full transition-all duration-1000",
                                 progress >= 100 ? "bg-success-foreground" : "bg-brand"
                              )} 
                              style={{ width: ${progress}% }} 
                           />
                        </div>
                     </div>
                  </Link>
               );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
