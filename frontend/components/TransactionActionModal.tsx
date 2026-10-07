import React, { useState, useEffect } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

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
    <Modal open ariaLabel={mode === "correct" ? "Correct transaction" : "Edit transaction metadata"} onClose={() => { if (!isLoading) onClose(); }} closeOnBackdrop={!isLoading} panelClassName="goal-modal-panel">
        <button onClick={onClose} disabled={isLoading} aria-label="Close transaction dialog" className="absolute right-6 top-6 text-muted-foreground hover:text-card-foreground disabled:opacity-50">
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
              <label htmlFor="transaction-new-amount" className="block text-sm font-semibold mb-1">New Amount (GH₵)</label>
              <input id="transaction-new-amount" type="number" step="0.01" value={amountStr} onChange={e => setAmountStr(e.target.value)} required className="w-full p-3 border border-border bg-muted rounded-xl" />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="transaction-funding-source" className="block text-sm font-semibold mb-1">Funding Source</label>
                <input id="transaction-funding-source" type="text" value={fundingSource} onChange={e => setFundingSource(e.target.value)} className="w-full p-3 border border-border bg-muted rounded-xl" placeholder="e.g. Bank Transfer" />
              </div>
              <div>
                <label htmlFor="transaction-note" className="block text-sm font-semibold mb-1">Note</label>
                <input id="transaction-note" type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 border border-border bg-muted rounded-xl" placeholder="Extra details" />
              </div>
            </>
          )}
          <button type="submit" disabled={isLoading} className="w-full bg-brand hover:bg-brand/90 text-white py-3.5 rounded-xl font-semibold mt-2">
            {isLoading ? "Saving..." : (mode === "correct" ? "Confirm Correction" : "Save Metadata")}
          </button>
        </form>
    </Modal>
  );
}


