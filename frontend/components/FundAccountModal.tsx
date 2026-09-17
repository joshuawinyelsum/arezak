import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type FundAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onSuccess: () => void;
};

const FUNDING_SOURCES = [
  "Salary", "Allowance", "Business", "Gift", "Transfer", "Other"
];

export function FundAccountModal({ isOpen, onClose, accountId, onSuccess }: FundAccountModalProps) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState(FUNDING_SOURCES[0]);
  const [customSource, setCustomSource] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const finalSource = source === "Other" ? customSource : source;
      const res = await apiFetch("/transactions/income", {
        method: "POST",
        body: JSON.stringify({
          account_id: accountId,
          amount: { amount_pesewas: Math.round(amountVal * 100), currency: "GHS" },
          funding_source: finalSource,
          note: note,
          description: note || `Funded via ${finalSource}`
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail?.message || "Failed to fund account.");
      }
      onSuccess();
      onClose();
      setAmount("");
      setNote("");
      setCustomSource("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">Fund Account</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (GH₵)</label>
            <input type="number" step="0.01" min="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50" placeholder="0.00" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Funding source</label>
            <select value={source} onChange={e => setSource(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 bg-white">
              {FUNDING_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          {source === "Other" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Custom source</label>
              <input type="text" required value={customSource} onChange={e => setCustomSource(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50" placeholder="e.g. Freelance" />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50" placeholder="e.g. September allowance" />
          </div>
          
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white bg-brand hover:bg-brand-hover transition-colors flex items-center justify-center">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fund Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
