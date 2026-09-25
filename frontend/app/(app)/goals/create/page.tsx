"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Calendar, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import * as LucideIcons from "lucide-react";

type Category = {
  id: string;
  name: string;
  icon: string;
  is_system: boolean;
};

const ICON_MAP: Record<string, React.FC<any>> = {
  "Shield": LucideIcons.Shield,
  "Home": LucideIcons.Home,
  "GraduationCap": LucideIcons.GraduationCap,
  "Heart": LucideIcons.Heart,
  "Laptop": LucideIcons.Laptop,
  "Plane": LucideIcons.Plane,
  "Users": LucideIcons.Users,
  "Music": LucideIcons.Music,
  "Briefcase": LucideIcons.Briefcase,
  "Car": LucideIcons.Car,
  "Wheat": LucideIcons.Wheat,
  "Cross": LucideIcons.Cross,
  "Smartphone": LucideIcons.Smartphone,
  "TrendingUp": LucideIcons.TrendingUp,
  "Wallet": LucideIcons.Wallet,
  "Settings": LucideIcons.Settings,
  "ShoppingCart": LucideIcons.ShoppingCart,
  "Banknote": LucideIcons.Banknote,
  "Building": LucideIcons.Building,
  "Gift": LucideIcons.Gift,
  "Key": LucideIcons.Key,
  "Camera": LucideIcons.Camera
};

export default function CreateGoalPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lockType, setLockType] = useState<"TARGET_REACHED" | "DATE_REACHED">("TARGET_REACHED");
  const [unlockDate, setUnlockDate] = useState("");

  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const res = await apiFetch("/goal-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) {
          setCategoryId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError("Please enter a goal name.");
        return;
      }
      const amountFloat = parseFloat(targetAmount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        setError("Please enter a valid target amount.");
        return;
      }
      if (!categoryId) {
        setError("Please select a category.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (lockType === "DATE_REACHED" && !unlockDate) {
        setError("Please select an unlock date.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    const amountPesewas = Math.round(parseFloat(targetAmount) * 100);

    const payload: any = {
      name: name.trim(),
      target_amount: amountPesewas,
      currency: "GHS",
      category_id: categoryId,
      lock_type: lockType
    };

    if (lockType === "DATE_REACHED" && unlockDate) {
       // Convert YYYY-MM-DD to ISO 8601 UTC
       payload.unlock_date = new Date(unlockDate).toISOString();
    }

    try {
      const res = await apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail?.message || errData.detail || "Failed to create goal");
      }

      router.push("/goals");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 pt-4 px-4">
      
      {/* Header */}
      <header className="flex items-center gap-3 py-2">
         <button 
           onClick={() => step === 1 ? router.push("/goals") : setStep((step - 1) as any)} 
           className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
         >
           <ArrowLeft className="w-5 h-5 text-slate-700" />
         </button>
         <h1 className="text-xl font-bold text-slate-900">Create Goal</h1>
      </header>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between px-2 mb-8">
         <div className="flex flex-col items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors", step >= 1 ? "bg-brand text-white" : "bg-slate-100 text-slate-400")}>1</div>
            <span className={cn("text-xs font-semibold", step >= 1 ? "text-slate-900" : "text-slate-400")}>Define</span>
         </div>
         <div className={cn("flex-1 h-1 mx-2 rounded-full transition-colors", step >= 2 ? "bg-brand" : "bg-slate-100")} />
         <div className="flex flex-col items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors", step >= 2 ? "bg-brand text-white" : "bg-slate-100 text-slate-400")}>2</div>
            <span className={cn("text-xs font-semibold", step >= 2 ? "text-slate-900" : "text-slate-400")}>Condition</span>
         </div>
         <div className={cn("flex-1 h-1 mx-2 rounded-full transition-colors", step >= 3 ? "bg-brand" : "bg-slate-100")} />
         <div className="flex flex-col items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors", step >= 3 ? "bg-brand text-white" : "bg-slate-100 text-slate-400")}>3</div>
            <span className={cn("text-xs font-semibold", step >= 3 ? "text-slate-900" : "text-slate-400")}>Review</span>
         </div>
      </div>

      <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-200">
         {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-6 border border-red-100">
               <AlertCircle className="w-5 h-5 shrink-0" />
               <p className="text-sm font-medium">{error}</p>
            </div>
         )}

         {/* STEP 1: DEFINE THE GOAL */}
         {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">What are you saving for?</label>
                  <input
                     type="text"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="e.g., MacBook Pro"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Target Amount</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GH₵</span>
                     <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        placeholder="10000.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all text-lg"
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Category</label>
                  {isLoadingCategories ? (
                     <div className="flex items-center gap-2 text-slate-400 text-sm p-4 bg-slate-50 rounded-xl">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading categories...
                     </div>
                  ) : (
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {categories.map((cat) => {
                           const IconComponent = ICON_MAP[cat.icon] || Target;
                           const isSelected = categoryId === cat.id;
                           return (
                              <button
                                 key={cat.id}
                                 onClick={() => setCategoryId(cat.id)}
                                 className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                    isSelected ? "border-brand bg-brand/5 text-brand" : "border-slate-100 hover:border-slate-200 text-slate-500 bg-white"
                                 )}
                              >
                                 <IconComponent className="w-5 h-5" />
                                 <span className="text-xs font-semibold">{cat.name}</span>
                              </button>
                           );
                        })}
                     </div>
                  )}
               </div>

               <button 
                  onClick={handleNext}
                  className="w-full bg-brand text-white font-bold rounded-xl py-4 mt-4 transition-all shadow-sm hover:bg-brand/90 active:scale-[0.98]"
               >
                  Continue
               </button>
            </div>
         )}

         {/* STEP 2: CHOOSE UNLOCK CONDITION */}
         {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">When can you unlock this money?</h2>
                  <p className="text-sm text-slate-500 mb-6">Choose the condition that determines when this goal is complete.</p>
                  
                  <div className="space-y-4">
                     {/* Target Option */}
                     <label className={cn(
                        "flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all",
                        lockType === "TARGET_REACHED" ? "border-brand bg-brand/5" : "border-slate-100 hover:border-slate-200 bg-white"
                     )}>
                        <input 
                           type="radio" 
                           name="lockType" 
                           className="hidden" 
                           checked={lockType === "TARGET_REACHED"}
                           onChange={() => setLockType("TARGET_REACHED")}
                        />
                        <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors", lockType === "TARGET_REACHED" ? "border-brand bg-brand" : "border-slate-300")}>
                           {lockType === "TARGET_REACHED" && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-900">Unlock when I reach my target</h3>
                           <p className="text-sm text-slate-500 mt-1 leading-relaxed">The Goal becomes eligible for release once your target amount is reached.</p>
                        </div>
                     </label>

                     {/* Date Option */}
                     <label className={cn(
                        "flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all",
                        lockType === "DATE_REACHED" ? "border-brand bg-brand/5" : "border-slate-100 hover:border-slate-200 bg-white"
                     )}>
                        <input 
                           type="radio" 
                           name="lockType" 
                           className="hidden" 
                           checked={lockType === "DATE_REACHED"}
                           onChange={() => setLockType("DATE_REACHED")}
                        />
                        <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors", lockType === "DATE_REACHED" ? "border-brand bg-brand" : "border-slate-300")}>
                           {lockType === "DATE_REACHED" && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <div className="w-full">
                           <h3 className="font-bold text-slate-900">Unlock on a date</h3>
                           <p className="text-sm text-slate-500 mt-1 mb-3 leading-relaxed">The money stays locked until the date you choose.</p>
                           
                           {lockType === "DATE_REACHED" && (
                              <div className="relative w-full max-w-xs animate-in fade-in zoom-in-95">
                                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand pointer-events-none" />
                                 <input 
                                    type="date"
                                    value={unlockDate}
                                    onChange={(e) => setUnlockDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                 />
                              </div>
                           )}
                        </div>
                     </label>
                  </div>
               </div>

               <button 
                  onClick={handleNext}
                  className="w-full bg-brand text-white font-bold rounded-xl py-4 mt-4 transition-all shadow-sm hover:bg-brand/90 active:scale-[0.98]"
               >
                  Continue
               </button>
            </div>
         )}

         {/* STEP 3: REVIEW */}
         {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               
               <div className="text-center mb-2">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Review Your Goal</h2>
                  <p className="text-sm text-slate-500">Please confirm your objective.</p>
               </div>

               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-5">
                  <div>
                     <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Goal</div>
                     <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {name}
                     </div>
                  </div>
                  <div className="w-full h-px bg-slate-200" />
                  <div>
                     <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target</div>
                     <div className="text-xl font-bold text-brand">GH₵ {parseFloat(targetAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="w-full h-px bg-slate-200" />
                  <div>
                     <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Unlock condition</div>
                     <div className="text-base font-bold text-slate-700">
                        {lockType === "TARGET_REACHED" ? "When target is reached" : `Unlock date: ${new Date(unlockDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                     </div>
                  </div>
               </div>

               <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 font-medium leading-relaxed">
                     Creating this Goal does not move any money. <br/>
                     Money becomes locked only when you contribute to this Goal.
                  </p>
               </div>

               <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-brand text-white font-bold rounded-xl py-4 mt-4 transition-all shadow-sm hover:bg-brand/90 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
               >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isSubmitting ? "Creating..." : "Create Goal"}
               </button>
            </div>
         )}
      </div>
    </div>
  );
}
