import React, { useState, useEffect } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function TransactionActionModal({ isOpen, onClose, transaction, mode, onSuccess }: any) {
  const [amountStr, setAmountStr] = useState("");
  const [fundingSource, setFundingSource] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transaction) {
      if (mode === "correct") {
        setAmountStr((transaction.amount.amount_pesewas / 100).toString());
      } else {
        setFundingSource(transaction.funding_source || "");
        setNote(transaction.note || "");
      }
      setError(null);
    }
  }, [isOpen, transaction, mode]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (mode === "correct") {
        const amountFloat = parseFloat(amountStr);
        if (isNaN(amountFloat) || amountFloat <= 0) {
          throw new Error("Amount must be greater than 0");
        }
        const payload = {
          amount: { amount_pesewas: Math.round(amountFloat * 100), currency: transaction.amount.currency }
        };
        const res = await apiFetch(`/transactions/${transaction.id}/correct`, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail?.message || err.detail || "Failed to correct transaction");
        }
      } else {
        const payload = {
          funding_source: fundingSource || null,
          note: note || null
        };
        const res = await apiFetch(`/transactions/${transaction.id}/metadata`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail?.message || err.detail || "Failed to update metadata");
        }
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
        <h2 className="text-xl font-bold mb-4">{mode === "correct" ? "Correct Transaction" : "Edit Metadata"}</h2>
        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4 text-center border border-red-100">{error}</div>}
        
        {mode === "correct" && (
          <div className="bg-orange-50 text-orange-800 p-3 rounded-xl text-sm mb-4">
             Warning: A reversal transaction will be created for the original amount of GH₵{(transaction.amount.amount_pesewas / 100).toFixed(2)}, and a new transaction will replace it.
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "correct" ? (
            <div>
              <label className="block text-sm font-semibold mb-1">New Amount (GH₵)</label>
              <input type="number" step="0.01" value={amountStr} onChange={e => setAmountStr(e.target.value)} required className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">Funding Source</label>
                <input type="text" value={fundingSource} onChange={e => setFundingSource(e.target.value)} className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl" placeholder="e.g. Bank Transfer" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Note</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl" placeholder="Extra details" />
              </div>
            </>
          )}
          <button type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold mt-2">
            {isLoading ? "Saving..." : (mode === "correct" ? "Confirm Correction" : "Save Metadata")}
          </button>
        </form>
      </div>
    </div>
  );
}

