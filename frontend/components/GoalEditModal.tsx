import React, { useState, useEffect } from "react";
import { Loader2, X, AlertCircle, Target, icons } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { IconPicker } from "./IconPicker";
import { cn } from "@/lib/utils";

export function GoalEditModal({ isOpen, onClose, goal, onSuccess }: any) {
  const [name, setName] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [icon, setIcon] = useState("Target");
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && goal) {
      setName(goal.name || "");
      setTargetStr((goal.target_amount / 100).toString());
      setIcon(goal.icon || "Target");
      setError(null);
    }
  }, [isOpen, goal]);

  if (!isOpen || !goal) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const payload = {
        name: name.trim(),
        icon,
        target_amount: Math.round(parseFloat(targetStr) * 100),
      };
      
      const res = await apiFetch(`/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || "Failed to update goal");
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const SelectedIcon = icons[icon as keyof typeof icons] || Target;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl relative animate-in zoom-in-95">
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="absolute right-6 top-6 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-bold text-slate-900 mb-6">Edit Goal</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl mb-4 text-center border border-red-100 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Icon Picker Button */}
            <div className="flex flex-col items-center mb-6">
              <button
                type="button"
                onClick={() => setIsIconPickerOpen(true)}
                className="w-20 h-20 bg-brand/10 text-brand rounded-[20px] flex items-center justify-center hover:bg-brand/20 hover:scale-105 transition-all group"
              >
                <SelectedIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
              </button>
              <div className="text-xs font-semibold text-brand mt-2">Tap to change icon</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Goal Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                disabled={isLoading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Target Amount (GH₵)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01"
                value={targetStr} 
                onChange={e => setTargetStr(e.target.value)} 
                required 
                disabled={isLoading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-50" 
              />
              {goal.current_amount > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Currently funded: GH₵{(goal.current_amount / 100).toFixed(2)}.<br/>Target cannot be set lower than this amount.
                </p>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-brand text-white py-3.5 mt-2 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand/90 transition-colors shadow-sm disabled:opacity-70"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
      
      <IconPicker 
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        value={icon}
        onChange={setIcon}
      />
    </>
  );
}




