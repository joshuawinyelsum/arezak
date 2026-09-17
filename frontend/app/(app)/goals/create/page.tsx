"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, Shield, Laptop, Plane, Home as HomeIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const goalTypes = [
  { id: "general", title: "General Savings", subtitle: "Flexible goal", icon: Wallet, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
  { id: "emergency", title: "Emergency Fund", subtitle: "Safety net", icon: Shield, iconBg: "bg-green-50", iconColor: "text-green-500" },
  { id: "tech", title: "Laptop / Tech", subtitle: "Devices & equipment", icon: Laptop, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
  { id: "travel", title: "Travel", subtitle: "Explore the world", icon: Plane, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
  { id: "home", title: "Home", subtitle: "Big dreams", icon: HomeIcon, iconBg: "bg-red-50", iconColor: "text-red-500" },
];

export default function CreateGoalPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("tech");
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const amountFloat = parseFloat(targetAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setError("Please enter a valid positive target amount.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: name.trim() || goalTypes.find(t => t.id === selectedType)?.title || "Goal",
      target_amount: Math.round(amountFloat * 100), // to pesewas
      currency: "GHS"
    };

    try {
      const res = await apiFetch("/goals/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail?.message || errData.detail || "Failed to create goal");
      }

      router.push("/goals");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <header className="flex items-center gap-4 py-4 mb-2">
         <Link href="/goals" className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors" aria-disabled={isSubmitting}>
           <ArrowLeft className="w-5 h-5 text-slate-900" />
         </Link>
         <h1 className="text-xl font-bold text-slate-900">Create Goal</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-32">
         {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100">
               <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
               <p className="text-sm font-medium">{error}</p>
            </div>
         )}

         <form id="create-goal-form" onSubmit={handleSubmit} className="space-y-6">
           <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Goal Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MacBook Pro M3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Target Amount (GH₵)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="2000.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50"
                  required
                  disabled={isSubmitting}
                />
              </div>
           </div>

           <div>
              <h2 className="text-sm font-bold text-slate-900">Goal Icon</h2>
              <p className="text-xs text-slate-500 mt-1 mb-3">Choose a category for this goal</p>
              
              <div className="space-y-3">
                 {goalTypes.map(type => {
                    const isSelected = selectedType === type.id;
                    return (
                       <button 
                         key={type.id}
                         type="button"
                         onClick={() => setSelectedType(type.id)}
                         disabled={isSubmitting}
                         className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all disabled:opacity-50",
                            isSelected ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-slate-200 bg-white hover:border-slate-300"
                         )}
                       >
                          <div className="flex items-center gap-4">
                             <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", type.iconBg, type.iconColor)}>
                                <type.icon className="w-6 h-6" />
                             </div>
                             <div>
                                <div className="font-semibold text-sm text-slate-900">{type.title}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{type.subtitle}</div>
                             </div>
                          </div>
                          <div className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 mr-1">
                             {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>}
                          </div>
                       </button>
                    );
                 })}
              </div>
           </div>
         </form>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 md:static md:border-none md:p-0 md:bg-transparent md:pb-safe z-10">
         <button 
           type="submit"
           form="create-goal-form"
           disabled={isSubmitting}
           className="w-full flex justify-center items-center gap-2 bg-brand text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-brand/20 hover:bg-brand/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
         >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : (
              "Create Goal"
            )}
         </button>
      </div>
    </div>
  );
}
