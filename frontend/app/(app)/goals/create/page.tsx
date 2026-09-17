"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import * as LucideIcons from "lucide-react";

// The full map of allowed icons to render them dynamically.
// This matches the icon strings we expect from the backend.
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

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface GoalCategory {
  id: string;
  name: string;
  icon: string;
  is_system: boolean;
}

export default function CreateGoalPage() {
  const router = useRouter();
  
  // Data state
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  
  // Form state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Category Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState<string>("Wallet");
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const res = await apiFetch("/goal-categories/");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategoryId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmittingCat(true);
    
    try {
      const res = await apiFetch("/goal-categories/", {
        method: "POST",
        body: JSON.stringify({
          name: newCatName.trim(),
          icon: newCatIcon
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail?.message || errData.detail || "Failed to create category");
      }
      
      const newCategory = await res.json();
      setCategories(prev => [...prev, newCategory]);
      setSelectedCategoryId(newCategory.id);
      setIsModalOpen(false);
      setNewCatName("");
      setNewCatIcon("Wallet");
    } catch (err: any) {
      setModalError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingCat(false);
    }
  };

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

    if (!selectedCategoryId) {
      setError("Please select a category.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: name.trim() || categories.find(c => c.id === selectedCategoryId)?.name || "Goal",
      target_amount: Math.round(amountFloat * 100), // to pesewas
      currency: "GHS",
      category_id: selectedCategoryId
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
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Target Amount (GH¢)</label>
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
              <h2 className="text-sm font-bold text-slate-900">Category</h2>
              <p className="text-xs text-slate-500 mt-1 mb-3">Choose a category for this goal</p>
              
              {isLoadingCategories ? (
                <div className="flex items-center justify-center p-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                   {categories.map(cat => {
                      const isSelected = selectedCategoryId === cat.id;
                      const IconComp = ICON_MAP[cat.icon] || LucideIcons.Wallet;
                      return (
                         <button 
                           key={cat.id}
                           type="button"
                           onClick={() => setSelectedCategoryId(cat.id)}
                           disabled={isSubmitting}
                           className={cn(
                              "w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all disabled:opacity-50",
                              isSelected ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-slate-200 bg-white hover:border-slate-300"
                           )}
                         >
                            <div className="flex items-center gap-4">
                               <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", 
                                  cat.is_system ? "bg-slate-100 text-slate-600" : "bg-brand/10 text-brand"
                               )}>
                                  <IconComp className="w-6 h-6" />
                               </div>
                               <div>
                                  <div className="font-semibold text-sm text-slate-900">{cat.name}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">{cat.is_system ? "Preset category" : "Custom category"}</div>
                               </div>
                            </div>
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 mr-1">
                               {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>}
                            </div>
                         </button>
                      );
                   })}
                   
                   <button
                     type="button"
                     onClick={() => setIsModalOpen(true)}
                     className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-slate-300 text-slate-500 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all"
                   >
                     <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                       <Plus className="w-4 h-4" />
                     </div>
                     <span className="font-semibold text-sm">Create custom category</span>
                   </button>
                </div>
              )}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Create custom category</h2>
            <form onSubmit={handleCreateCategory} className="space-y-6">
              {modalError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">
                  {modalError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Category name</label>
                <input 
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Music Equipment"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  required
                  disabled={isSubmittingCat}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Choose icon</label>
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                  {AVAILABLE_ICONS.map(iconName => {
                    const Icon = ICON_MAP[iconName];
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewCatIcon(iconName)}
                        className={cn(
                          "aspect-square rounded-xl flex items-center justify-center transition-all",
                          newCatIcon === iconName ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  disabled={isSubmittingCat}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingCat}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand/90 flex items-center justify-center gap-2"
                >
                  {isSubmittingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
