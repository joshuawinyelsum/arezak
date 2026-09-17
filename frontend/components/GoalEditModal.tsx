import React, { useState, useEffect } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function GoalEditModal({ isOpen, onClose, goal, onSuccess }: any) {
  const [name, setName] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      apiFetch("/goal-categories").then(res => res.json()).then(setCategories).catch(() => {});
      setName(goal?.name || "");
      setTargetStr(goal ? (goal.target_amount / 100).toString() : "");
      setCategoryId(goal?.category?.id || "");
    }
  }, [isOpen, goal]);

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        name,
        target_amount: Math.round(parseFloat(targetStr) * 100),
        category_id: categoryId || null
      };
      const res = await apiFetch(`/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || "Failed to update");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute right-6 top-6 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-4">Edit Goal</h2>
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Target Amount</label>
            <input type="number" step="0.01" value={targetStr} onChange={e => setTargetStr(e.target.value)} required className="w-full p-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-2 border rounded-xl">
              <option value="">No Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-brand text-white py-3 rounded-xl font-semibold">
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

