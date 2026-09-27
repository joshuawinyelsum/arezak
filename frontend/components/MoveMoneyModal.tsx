/**
 * MoveMoneyModal — Send / Pay / Withdraw flow.
 *
 * Each action has its own title and context. The "menu" step only appears
 * when no initialStep is provided (e.g. from the legacy "Move Money" CTA).
 * When opened from a Home action button (Send/Pay/Withdraw), initialStep
 * bypasses the menu and goes straight to the form.
 *
 * This is a TEMPORARY implementation. The long-term architecture should be:
 *   - SendFlow: dedicated page with recipient search, network selection, confirmation
 *   - PayFlow: dedicated page with service/merchant selection
 *   - WithdrawFlow: dedicated page with destination method and fee review
 *
 * Current limitations (backend capabilities do not yet exist):
 *   - No recipient directory / contact lookup
 *   - No mobile money provider selection (MTN / Telecel / AirtelTigo)
 *   - No bank destination support
 *   - No real-time fee calculation
 *   - No external provider integration
 *   - Marked "Simulation" because /transactions/outbound reduces balance
 *     internally but does not connect to any external payment rail.
 *
 * MISSING BACKEND CONTRACTS (for future phases):
 *   - POST /recipients — create/validate recipient
 *   - GET /recipients — list saved recipients
 *   - POST /transactions/send — dedicated send with provider routing
 *   - POST /transactions/pay — merchant/bill payment
 *   - POST /transactions/withdraw — external withdrawal with provider rail
 *   - GET /fees?type=send&amount={n} — fee preview before confirmation
 */

import React, { useState } from "react";
import {
  Loader2,
  X,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  ShoppingBag,
  Landmark,
  Info,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type ModalStep = "menu" | "send" | "pay" | "withdraw";

interface Account {
  id: string;
  name: string;
  available_balance: { amount_pesewas: number };
}

interface MoveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: number;
  accounts: Account[];
  initialStep?: ModalStep;
}

const STEP_META: Record<
  Exclude<ModalStep, "menu">,
  { title: string; destinationLabel: string; placeholder: string; txType: string }
> = {
  send: {
    title: "Send Money",
    destinationLabel: "Recipient (phone number or name)",
    placeholder: "055 XXX XXXX",
    txType: "TRANSFER_OUT",
  },
  pay: {
    title: "Pay",
    destinationLabel: "Merchant / Bill Details",
    placeholder: "e.g. ECG meter number, merchant name",
    txType: "SPEND",
  },
  withdraw: {
    title: "Withdraw",
    destinationLabel: "Destination (mobile money / bank)",
    placeholder: "e.g. MTN — 024 XXX XXXX",
    txType: "WITHDRAW",
  },
};

export function MoveMoneyModal({
  isOpen,
  onClose,
  onSuccess,
  availableBalance,
  accounts,
  initialStep,
}: MoveMoneyModalProps) {
  const [step, setStep] = useState<ModalStep>(initialStep ?? "menu");
  const [amountStr, setAmountStr] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStep(initialStep ?? "menu");
      setAmountStr("");
      setDestination("");
      setDescription("");
      setError(null);
      if (accounts && accounts.length > 0) {
        setAccountId(accounts[0].id);
      }
    }
  }, [isOpen, accounts, initialStep]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "menu") return;

    setIsLoading(true);
    setError(null);

    try {
      const amountFloat = parseFloat(amountStr);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Amount must be greater than 0");
      }
      if (amountFloat * 100 > availableBalance) {
        throw new Error(
          `Insufficient available balance. You have GH₵${(availableBalance / 100).toFixed(2)} available.`
        );
      }

      const meta = STEP_META[step];

      const payload = {
        account_id: accountId,
        amount: { amount_pesewas: Math.round(amountFloat * 100), currency: "GHS" },
        type: meta.txType,
        destination: destination,
        description: description || meta.title,
      };

      const res = await apiFetch("/transactions/outbound", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail?.message || err.detail || "Transaction failed");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (initialStep && initialStep !== "menu") {
      // Opened directly from an action — back closes the modal
      onClose();
    } else {
      setStep("menu");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-t-[28px] sm:rounded-[24px] w-full sm:max-w-sm p-6 shadow-xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95">
        {/* Close */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-5 top-5 text-slate-300 hover:text-slate-600 transition-colors p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Menu step: only shown when no initialStep given ── */}
        {step === "menu" ? (
          <div>
            <h2 className="text-xl font-bold mb-1 text-slate-900">Move Money</h2>
            <p className="text-sm text-slate-400 mb-5">What would you like to do?</p>

            <div className="space-y-2.5">
              {(["send", "pay", "withdraw"] as const).map((s) => {
                const meta = STEP_META[s];
                const icons = { send: ArrowUpRight, pay: ShoppingBag, withdraw: Landmark };
                const colors = {
                  send: "bg-blue-50 text-blue-500",
                  pay: "bg-orange-50 text-orange-500",
                  withdraw: "bg-purple-50 text-purple-500",
                };
                const Icon = icons[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStep(s)}
                    className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-brand/30 hover:bg-brand/5 transition-colors text-left group"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colors[s]}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{meta.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {meta.destinationLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Action step ── */
          <div>
            {/* Header with back button */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="text-slate-400 hover:text-slate-900 p-1 -ml-1 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">
                {STEP_META[step].title}
              </h2>
            </div>

            {/* Simulation notice — honest about current state */}
            <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs mb-4 flex items-start gap-2 border border-amber-100">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                <strong>Simulation.</strong> Your Arezak balance will be updated. No money
                is transferred to an external provider in this version.
              </span>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl mb-4 flex items-start gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* From account — only show if multiple accounts */}
              {accounts.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-slate-900">
                    From
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    disabled={isLoading}
                    className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none text-sm"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} — GH₵
                        {(acc.available_balance.amount_pesewas / 100).toFixed(2)} available
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-semibold text-slate-900">Amount</label>
                  <span className="text-xs text-slate-400">
                    Available: GH₵{(availableBalance / 100).toFixed(2)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                    GH₵
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    max={availableBalance / 100}
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 p-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-900">
                  {STEP_META[step].destinationLabel}
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  disabled={isLoading}
                  inputMode={step === "send" ? "tel" : "text"}
                  className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none text-sm"
                  placeholder={STEP_META[step].placeholder}
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-900">
                  Note{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none text-sm"
                  placeholder="e.g. School fees payment"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand hover:bg-brand-hover transition-colors text-white py-3.5 rounded-xl font-semibold mt-1 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm ${STEP_META[step].title}`
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
