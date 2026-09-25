"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Target } from "lucide-react";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { IconPicker } from "@/components/IconPicker";



export default function CreateGoalPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Target");
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [targetAmountStr, setTargetAmountStr] = useState("");
  
  const [lockType, setLockType] = useState<"TARGET_REACHED" | "DATE_REACHED" | "TARGET_AND_DATE">("TARGET_REACHED");
  const [unlockDate, setUnlockDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
      setError(null);
      if (step === 1) {
         if (!name.trim()) {
            setError("Please enter a goal name.");
            return;
         }
         setStep(2);
      } else if (step === 2) {
         const amount = parseFloat(targetAmountStr);
         if (isNaN(amount) || amount <= 0) {
            setError("Please enter a valid target amount.");
            return;
         }
         setStep(3);
      } else if (step === 3) {
         if ((lockType === "DATE_REACHED" || lockType === "TARGET_AND_DATE") && !unlockDate) {
            setError("Please select an unlock date.");
            return;
         }
         setStep(4);
      }
  };

  const handleBack = () => {
      setError(null);
      if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const amountPesewas = Math.round(parseFloat(targetAmountStr) * 100);

    try {
      const payload = {
        name: name.trim(),
        icon,
        target_amount: amountPesewas,
        currency: "GHS",
        lock_type: lockType,
        unlock_date: (lockType === "DATE_REACHED" || lockType === "TARGET_AND_DATE") && unlockDate ? new Date(unlockDate).toISOString() : null,
      };

      const res = await apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create goal.");
      }

      router.push("/goals");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-4 pt-4">
      <header className="flex items-center justify-between py-2 mb-2">
         <div className="flex items-center gap-3">
            <button onClick={step === 1 ? () => router.push("/goals") : handleBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
               <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Create Goal</h1>
         </div>
         <div className="text-sm font-semibold text-slate-400">Step {step} of 4</div>
      </header>

      {error && (
         <div className="bg-red-50 text-red-600 text-sm font-medium p-4 rounded-xl flex items-start gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{error}</div>
         </div>
      )}

      <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-200">
         
         {/* STEP 1: IDENTITY */}
         {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">What are you saving for?</h2>
                  <p className="text-slate-500 text-sm">Give your goal a name and choose an icon.</p>
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Goal Name</label>
                  <input
                     type="text"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="e.g. MacBook Pro, Emergency Fund"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                     autoFocus
                  />
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Choose Icon</label>
                  <button
                    type="button"
                    onClick={() => setIsIconPickerOpen(true)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand/10 text-brand rounded-lg flex items-center justify-center">
                        <Icon name={icon} className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-slate-700">{icon}</span>
                    </div>
                    <span className="text-sm font-bold text-brand">Change Icon</span>
                  </button>
               </div>

               <button 
                  onClick={handleNext}
                  className="w-full bg-brand text-white font-bold rounded-xl py-4 mt-4 transition-all shadow-sm hover:bg-brand/90 active:scale-[0.98]"
               >
                  Continue
               </button>
            </div>
         )}

         {/* STEP 2: TARGET */}
         {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Set your target</h2>
                  <p className="text-slate-500 text-sm">How much do you need to reach this goal?</p>
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Target Amount</label>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">GH₵</span>
                     <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={targetAmountStr}
                        onChange={(e) => setTargetAmountStr(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-16 pr-4 py-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                        autoFocus
                     />
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

         {/* STEP 3: UNLOCK CONDITION */}
         {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">When can you release it?</h2>
                  <p className="text-slate-500 text-sm">Choose the condition that unlocks these funds.</p>
               </div>

               <div className="space-y-3">
                  <button
                     onClick={() => setLockType("TARGET_REACHED")}
                     className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4",
                        lockType === "TARGET_REACHED" ? "border-brand bg-brand/5" : "border-slate-100 bg-white hover:border-slate-200"
                     )}
                  >
                     <div className={cn("w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center", lockType === "TARGET_REACHED" ? "border-brand" : "border-slate-300")}>
                        {lockType === "TARGET_REACHED" && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                     </div>
                     <div>
                        <div className="font-bold text-slate-900">When target is reached</div>
                        <div className="text-sm text-slate-500 mt-1">Funds unlock automatically as soon as you hit your target amount.</div>
                     </div>
                  </button>

                  <button
                     onClick={() => setLockType("DATE_REACHED")}
                     className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4",
                        lockType === "DATE_REACHED" ? "border-brand bg-brand/5" : "border-slate-100 bg-white hover:border-slate-200"
                     )}
                  >
                     <div className={cn("w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center", lockType === "DATE_REACHED" ? "border-brand" : "border-slate-300")}>
                        {lockType === "DATE_REACHED" && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                     </div>
                     <div>
                        <div className="font-bold text-slate-900">On a specific date</div>
                        <div className="text-sm text-slate-500 mt-1">Funds unlock when the date arrives, even if the target isn&apos;t reached.</div>
                     </div>
                  </button>

                  <button
                     onClick={() => setLockType("TARGET_AND_DATE")}
                     className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4",
                        lockType === "TARGET_AND_DATE" ? "border-brand bg-brand/5" : "border-slate-100 bg-white hover:border-slate-200"
                     )}
                  >
                     <div className={cn("w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center", lockType === "TARGET_AND_DATE" ? "border-brand" : "border-slate-300")}>
                        {lockType === "TARGET_AND_DATE" && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                     </div>
                     <div>
                        <div className="font-bold text-slate-900">Target reached AND date</div>
                        <div className="text-sm text-slate-500 mt-1">Both conditions must be met. The safest lock.</div>
                     </div>
                  </button>
               </div>

               {(lockType === "DATE_REACHED" || lockType === "TARGET_AND_DATE") && (
                  <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                     <label className="block text-sm font-bold text-slate-900 mb-2">Unlock Date</label>
                     <input
                        type="date"
                        value={unlockDate}
                        onChange={(e) => setUnlockDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                     />
                  </div>
               )}

               <button 
                  onClick={handleNext}
                  className="w-full bg-brand text-white font-bold rounded-xl py-4 mt-4 transition-all shadow-sm hover:bg-brand/90 active:scale-[0.98]"
               >
                  Continue
               </button>
            </div>
         )}

         {/* STEP 4: REVIEW */}
         {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Review your goal</h2>
                  <p className="text-slate-500 text-sm">Everything look correct?</p>
               </div>

               <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                        <Icon name={icon} className="w-6 h-6" />
                     </div>
                     <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Goal</div>
                        <div className="text-lg font-bold text-slate-900">{name}</div>
                     </div>
                  </div>
                  <div className="w-full h-px bg-slate-200" />
                  <div>
                     <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target</div>
                     <div className="text-xl font-bold text-slate-900">GH₵ {parseFloat(targetAmountStr).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="w-full h-px bg-slate-200" />
                  <div>
                     <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Unlock condition</div>
                     <div className="text-base font-bold text-slate-700">
                        {lockType === "TARGET_REACHED" ? "When target is reached" : 
                         lockType === "TARGET_AND_DATE" ? `Target reached AND ${new Date(unlockDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` :
                         `Unlock date: ${new Date(unlockDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
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
      
      <IconPicker 
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        value={icon}
        onChange={setIcon}
      />
    </div>
  );
}





