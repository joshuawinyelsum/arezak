"use client";

import React, { useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { QrScanner } from "@/components/identity/QrScanner";
import { ChoiceCard, FlowButton, FlowNotice, FlowField, AmountInput } from "../FlowControls";
import { FlowFooter } from "../FlowFooter";
import { FinancialFlowShell } from "../FinancialFlowShell";
import { GhanaPhoneField, NetworkSelector } from "../DestinationSelector";
import { SourceSelector } from "../SourceSelector";
import { ReviewTransaction } from "../ReviewTransaction";
import { formatGhs, normalizeGhanaPhone, parsePesewas } from "../money";
import { GhanaRail, ghanaRailLabel, MoneyAccount } from "../types";

type SendStep = "recipient" | "network" | "details" | "confirm-recipient" | "amount" | "review" | "result";
type RecipientType = "arezak" | "mobile";
type ResolvedRecipient = {
  display_name: string;
  handle: string | null;
  account_number: string;
  masked_phone_number: string | null;
};

export function SendFlow({ accounts, onClose, scanRequested = false }: { accounts: MoneyAccount[]; onClose: () => void; scanRequested?: boolean }) {
  const [step, setStep] = useState<SendStep>(scanRequested ? "details" : "recipient");
  const [recipientType, setRecipientType] = useState<RecipientType | null>(scanRequested ? "arezak" : null);
  const [rail, setRail] = useState<GhanaRail | null>(null);
  const [recipient, setRecipient] = useState("");
  const [resolvedRecipient, setResolvedRecipient] = useState<ResolvedRecipient | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const [completedTransactionId, setCompletedTransactionId] = useState<string | null>(null);

  const account = useMemo(() => accounts.find((item) => item.id === accountId), [accounts, accountId]);
  const pesewas = parsePesewas(amount);
  const enoughBalance = pesewas !== null && pesewas <= (account?.available_balance.amount_pesewas ?? 0);
  const isFirstStep = step === "recipient";
  const reviewRecipient = recipientType === "mobile" ? normalizeGhanaPhone(recipient) ?? recipient : recipient.trim();

  const handleBack = () => {
    setError(null);
    if (step === "result") onClose();
    else if (step === "review") setStep("amount");
    else if (step === "amount") setStep(recipientType === "arezak" ? "confirm-recipient" : "details");
    else if (step === "confirm-recipient") setStep("details");
    else if (step === "details") setStep(recipientType === "mobile" ? "network" : "recipient");
    else if (step === "network") setStep("recipient");
    else onClose();
  };

  const handleContinue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (step === "recipient") {
      if (recipientType) setStep(recipientType === "mobile" ? "network" : "details");
      return;
    }
    if (step === "network") {
      if (rail) setStep("details");
      return;
    }
    if (step === "details") {
      if (recipientType === "mobile") {
        if (!normalizeGhanaPhone(recipient)) {
          setError("Enter a valid Ghana phone number.");
          return;
        }
        setStep("amount");
        return;
      }
      if (!recipient.trim()) {
        setError("Enter an Arezak account number, @handle, verified phone number, or QR value.");
        return;
      }
      setIsResolving(true);
      try {
        const response = await apiFetch("/identity/resolve", {
          method: "POST",
          body: JSON.stringify({ identifier: recipient.trim() }),
        });
        setResolvedRecipient(await response.json());
        setStep("confirm-recipient");
      } catch {
        setError("We couldn’t find an active Arezak account for that identifier.");
      } finally {
        setIsResolving(false);
      }
      return;
    }
    if (step === "amount") {
      if (!pesewas) {
        setError("Enter an amount greater than GH₵0.00, using up to two decimal places.");
        return;
      }
      if (!enoughBalance) {
        setError("Amount exceeds this account’s available balance.");
        return;
      }
      idempotencyKey.current ??= crypto.randomUUID();
      setStep("review");
    }
  };

  const submitInternalTransfer = async () => {
    if (!pesewas || !accountId || !resolvedRecipient) return;
    setError(null);
    setIsSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await apiFetch("/operations/internal-transfer", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({
          account_id: accountId,
          recipient_identifier: recipient.trim(),
          amount: { amount_pesewas: pesewas, currency: "GHS" },
          note: note.trim() || null,
        }),
      });
      const result = await response.json();
      setCompletedTransactionId(result.transaction_id);
      setStep("result");
    } catch {
      setError("We couldn’t complete this transfer. Check your balance and try again; the same request key will be reused.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = "Send money";
  const stepLabel: Record<SendStep, string> = {
    recipient: "Recipient type",
    network: "Receiving network",
    details: "Recipient details",
    "confirm-recipient": "Confirm recipient",
    amount: "Amount",
    review: "Review",
    result: "Transfer complete",
  };

  return (
    <FinancialFlowShell
      title={title}
      stepLabel={stepLabel[step]}
      onBack={isFirstStep ? undefined : handleBack}
      onClose={onClose}
      footer={
        <FlowFooter hint={step === "review" && recipientType === "mobile" ? "No external provider is connected." : undefined}>
          {step === "review" && recipientType === "arezak" ? (
            <FlowButton onClick={submitInternalTransfer} disabled={isSubmitting}>{isSubmitting ? "Sending…" : `Send ${pesewas ? formatGhs(pesewas) : "money"}`}</FlowButton>
          ) : step === "review" ? (
            <FlowButton disabled>External sending unavailable</FlowButton>
          ) : step === "result" ? (
            <FlowButton onClick={onClose}>Done</FlowButton>
          ) : step === "confirm-recipient" ? (
            <FlowButton onClick={() => setStep("amount")}>Yes, continue</FlowButton>
          ) : (
            <FlowButton type="submit" form="send-flow-form" disabled={
              (step === "recipient" && !recipientType) ||
              (step === "network" && !rail) ||
              (step === "amount" && (!accountId || !pesewas || !enoughBalance)) ||
              isResolving
            }>
              {isResolving ? "Finding recipient…" : "Continue"}
            </FlowButton>
          )}
        </FlowFooter>
      }
    >
      {step === "result" ? (
        <section className="space-y-4 py-3 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
          <h3 className="text-xl font-bold text-foreground">Money sent to {resolvedRecipient?.display_name}</h3>
          <p className="text-sm text-muted-foreground">{pesewas ? formatGhs(pesewas) : ""} was transferred to their Arezak account.</p>
          <p className="text-xs text-muted-foreground">Transaction reference: {completedTransactionId}</p>
        </section>
      ) : step === "review" ? (
        <ReviewTransaction
          rows={[
            { label: "Recipient", value: recipientType === "arezak" ? resolvedRecipient?.display_name ?? "Arezak user" : reviewRecipient, strong: true },
            ...(recipientType === "mobile"
              ? [{ label: "Network", value: ghanaRailLabel(rail) }]
              : [
                  { label: "Handle", value: resolvedRecipient?.handle ?? "Not set" },
                  { label: "Account number", value: resolvedRecipient?.account_number ?? "—" },
                  ...(resolvedRecipient?.masked_phone_number ? [{ label: "Phone", value: resolvedRecipient.masked_phone_number }] : []),
                ]),
            { label: "From", value: account?.name ?? "Arezak account" },
            { label: "Amount", value: pesewas ? formatGhs(pesewas) : "—", strong: true },
            { label: "Fee", value: recipientType === "arezak" ? "No Arezak transfer fee" : "Unavailable" },
            { label: "Total debit", value: recipientType === "arezak" && pesewas ? formatGhs(pesewas) : "Unavailable", strong: true },
            ...(note.trim() ? [{ label: "Reference", value: note.trim() }] : []),
            { label: "Status", value: recipientType === "arezak" ? "Ready to send" : "Not submitted" },
          ]}
          notice={recipientType === "mobile"
            ? "No mobile-money provider is connected. This transaction will not be created and no balance will change."
            : "Review the verified account details before sending. This transfer will debit your account and credit the recipient’s Arezak account."}
        />
      ) : (
        <form id="send-flow-form" noValidate onSubmit={handleContinue} className="space-y-5">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {step === "recipient" && (
            <section className="space-y-3">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-foreground">Who are you sending to?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Choose where the recipient is registered.</p>
              </div>
              <ChoiceCard title="Arezak user" description="Find a person by account number, @handle, verified phone, or QR." selected={recipientType === "arezak"} onClick={() => setRecipientType("arezak")} />
              <ChoiceCard title="Mobile money" description="Choose a receiving network, then enter the mobile number." selected={recipientType === "mobile"} onClick={() => setRecipientType("mobile")} />
            </section>
          )}
          {step === "network" && (
            <section className="space-y-4">
              <div><h3 className="text-xl font-bold text-foreground">Choose receiving network</h3><p className="mt-1 text-sm text-muted-foreground">Select it directly. Arezak does not guess a network from the phone prefix.</p></div>
              <NetworkSelector value={rail} onChange={setRail} />
            </section>
          )}
          {step === "details" && (
            <section className="space-y-5">
              <div><h3 className="text-xl font-bold text-foreground">{recipientType === "arezak" ? "Arezak recipient" : "Recipient details"}</h3><p className="mt-1 text-sm text-muted-foreground">{recipientType === "arezak" ? "Scan a code or enter an account number or handle." : `Receiving on ${ghanaRailLabel(rail)}.`}</p></div>
              {recipientType === "mobile" ? <GhanaPhoneField value={recipient} onChange={setRecipient} label="Recipient mobile number" /> : <>
                <FlowField label="Account number, @handle, verified phone, or QR value" value={recipient} onChange={setRecipient} placeholder="e.g. 123456789012 or @handle" autoComplete="off" />
                <QrScanner onDetected={setRecipient} />
                <FlowNotice>Phone lookup is available only for verified numbers. Arezak does not search contacts or expose email addresses.</FlowNotice>
              </>}
            </section>
          )}
          {step === "confirm-recipient" && resolvedRecipient && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-foreground">Is this the right person?</h3>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-lg font-semibold text-foreground">{resolvedRecipient.display_name}</p>
                {resolvedRecipient.handle && <p className="mt-1 text-sm text-muted-foreground">{resolvedRecipient.handle}</p>}
                {resolvedRecipient.masked_phone_number && <p className="mt-1 text-sm text-muted-foreground">{resolvedRecipient.masked_phone_number}</p>}
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Arezak account</p>
                <p className="mt-1 font-mono text-lg tracking-wider text-foreground">{resolvedRecipient.account_number}</p>
              </div>
              <FlowNotice>Confirm the person before choosing how much to send.</FlowNotice>
            </section>
          )}
          {step === "amount" && (
            <section className="space-y-5">
              <div><h3 className="text-xl font-bold text-foreground">How much?</h3><p className="mt-1 text-sm text-muted-foreground">To {recipientType === "arezak" ? resolvedRecipient?.display_name : reviewRecipient}.</p></div>
              <SourceSelector accounts={accounts} value={accountId} onChange={setAccountId} />
              <AmountInput value={amount} onChange={setAmount} availableBalance={account?.available_balance.amount_pesewas ?? 0} />
              <FlowField label="Reference or note (optional)" value={note} onChange={setNote} required={false} placeholder="Add a note" maxLength={120} />
              {pesewas !== null && !enoughBalance && <p role="alert" className="text-sm text-red-700">Amount exceeds this account’s available balance.</p>}
            </section>
          )}
        </form>
      )}
      {error && (step === "review") && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </FinancialFlowShell>
  );
}

