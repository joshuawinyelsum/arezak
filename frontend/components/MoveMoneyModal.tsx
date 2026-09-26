import React, { useState } from "react";
import { Loader2, X, AlertCircle, ArrowUpRight, ShoppingBag, Banknote, Landmark } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function MoveMoneyModal({ isOpen, onClose, onSuccess, availableBalance, accounts }: any) {
  const [step, setStep] = useState<"menu" | "send" | "pay" | "cashout">("menu");
  const [amountStr, setAmountStr] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStep("menu");
      setAmountStr("");
      setDestination("");
      setDescription("");
      setError(null);
      if (accounts && accounts.length > 0) {
        setAccountId(accounts[0].id);
      }
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const amountFloat = parseFloat(amountStr);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Amount must be greater than 0");
      }
      
      let txType = "SPEND";
      if (step === "send") txType = "TRANSFER_OUT";
      if (step === "cashout") txType = "WITHDRAW";
      
      const payload = {
        account_id: accountId,
        amount: { amount_pesewas: Math.round(amountFloat * 100), currency: "GHS" },
        type: txType,
        destination: destination,
        description: description || (step === "send" ? "Money Sent" : step === "pay" ? "Payment" : "Cash Out")
      };

      const res = await apiFetch(`/transactions/outbound`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || "Transaction failed");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl relative animate-in zoom-in-95">
        <button onClick={onClose} disabled={isLoading} className="absolute right-6 top-6 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
        
        {step === "menu" ? (
          <div>
            <h2 className="text-xl font-bold mb-2">Move Money</h2>
            <p className="text-sm text-slate-500 mb-6">Choose how you want to use your available GH₵{(availableBalance/100).toFixed(2)}</p>
            
            <div className="space-y-3">
              <button onClick={() => setStep("send")} className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-brand hover:bg-brand/5 transition-colors text-left group">
                 <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-100"><ArrowUpRight className="w-5 h-5" /></div>
                 <div>
                    <div className="font-bold text-slate-900">Send Money</div>
                    <div className="text-xs text-slate-500">Transfer to another person</div>
                 </div>
              </button>
              
              <button onClick={() => setStep("pay")} className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-brand hover:bg-brand/5 transition-colors text-left group">
                 <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center group-hover:bg-orange-100"><ShoppingBag className="w-5 h-5" /></div>
                 <div>
                    <div className="font-bold text-slate-900">Pay</div>
                    <div className="text-xs text-slate-500">Pay a merchant or bill</div>
                 </div>
              </button>
              
              <button onClick={() => setStep("cashout")} className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-brand hover:bg-brand/5 transition-colors text-left group">
                 <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center group-hover:bg-green-100"><Landmark className="w-5 h-5" /></div>
                 <div>
                    <div className="font-bold text-slate-900">Cash Out</div>
                    <div className="text-xs text-slate-500">Withdraw to MoMo or bank</div>
                 </div>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep("menu")} disabled={isLoading} className="text-slate-400 hover:text-slate-900"><X className="w-5 h-5 rotate-45" style={{transform: 'rotate(-45deg)'}}/></button>
              <h2 className="text-xl font-bold">
                {step === "send" && "Send Money"}
                {step === "pay" && "Pay"}
                {step === "cashout" && "Cash Out"}
              </h2>
            </div>
            
            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl mb-4 flex items-center gap-2 border border-red-100"><AlertCircle className="w-4 h-4 shrink-0"/> {error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">From Account</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} disabled={isLoading || !accounts?.length} className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none">
                  {accounts?.map((acc: any) => (
                     <option key={acc.id} value={acc.id}>{acc.name} (GH₵{(acc.available_balance.amount_pesewas/100).toFixed(2)})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Amount (GH₵)</label>
                <input type="number" step="0.01" max={availableBalance/100} value={amountStr} onChange={e => setAmountStr(e.target.value)} required disabled={isLoading} className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none" placeholder="0.00" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {step === "send" && "Recipient (Mobile/Name)"}
                  {step === "pay" && "Merchant / Bill Details"}
                  {step === "cashout" && "Withdrawal Destination"}
                </label>
                <input type="text" value={destination} onChange={e => setDestination(e.target.value)} required disabled={isLoading} className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none" placeholder={step === "send" ? "055XXXXXXX" : ""} />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Reference / Note (Optional)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} disabled={isLoading} className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none" />
              </div>
              
              <button type="submit" disabled={isLoading} className="w-full bg-brand hover:bg-brand-hover transition-colors text-white py-3.5 rounded-xl font-semibold mt-2 flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin"/> Processing...</> : "Confirm"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
