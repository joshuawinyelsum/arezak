"use client";

import React, { useMemo, useState } from "react";
import { ChoiceCard, FlowButton, FlowNotice, FlowField, AmountInput } from "../FlowControls";
import { FlowFooter } from "../FlowFooter";
import { FinancialFlowShell } from "../FinancialFlowShell";
import { GhanaPhoneField, NetworkSelector } from "../DestinationSelector";
import { SourceSelector } from "../SourceSelector";
import { ReviewTransaction } from "../ReviewTransaction";
import { formatGhs, normalizeGhanaPhone, parsePesewas } from "../money";
import { GhanaRail, ghanaRailLabel, MoneyAccount } from "../types";

type SendStep = "recipient" | "network" | "details" | "amount" | "review";
type RecipientType = "arezak" | "mobile";

export function SendFlow({
  accounts,
  onClose,
}: {
  accounts: MoneyAccount[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<SendStep>("recipient");
  const [recipientType, setRecipientType] = useState<RecipientType | null>(null);
  const [rail, setRail] = useState<GhanaRail | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const account = useMemo(() => accounts.find((item) => item.id === accountId), [accounts, accountId]);
  const pesewas = parsePesewas(amount);
  const enoughBalance = pesewas !== null && pesewas <= (account?.available_balance.amount_pesewas ?? 0);
  const reviewRecipient = recipientType === "mobile" ? normalizeGhanaPhone(recipient) ?? recipient : recipient.trim();
  const isFirstStep = step === "recipient";

  const handleBack = () => {
    setError(null);
    if (step === "review") setStep("amount");
    else if (step === "amount") setStep("details");
    else if (step === "details") setStep(recipientType === "mobile" ? "network" : "recipient");
    else if (step === "network") setStep("recipient");
    else onClose();
  };

  const handleContinue = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (step === "recipient") {
      if (!recipientType) return;
      setStep(recipientType === "mobile" ? "network" : "details");
    } else if (step === "network") {
      if (!rail) return;
      setStep("details");
    } else if (step === "details") {
      if (recipientType === "mobile" && !normalizeGhanaPhone(recipient)) {
        setError("Enter a valid Ghana phone number.");
        return;
      }
      if (recipientType === "arezak" && !recipient.trim()) {
        setError("Enter an Arezak recipient identifier.");
        return;
      }
      setStep("amount");
    } else if (step === "amount") {
      if (!pesewas) {
        setError("Enter an amount greater than GH₵0.00, using up to two decimal places.");
        return;
      }
      if (!enoughBalance) {
        setError("Amount exceeds this account’s available balance.");
        return;
      }
      setStep("review");
    }
  };

  const title = "Send money";
  const stepLabels: Record<SendStep, string> = {
    recipient: recipientType === "mobile" ? "1 of 5 · Recipient" : "1 of 4 · Recipient",
    network: "2 of 5 · Network",
    details: recipientType === "mobile" ? "3 of 5 · Mobile number" : "2 of 4 · Recipient details",
    amount: recipientType === "mobile" ? "4 of 5 · Amount" : "3 of 4 · Amount",
    review: recipientType === "mobile" ? "5 of 5 · Review · Not submitted" : "4 of 4 · Review · Not submitted",
  };

  return (
    <FinancialFlowShell
      title={title}
      stepLabel={stepLabels[step]}
      onBack={isFirstStep ? undefined : handleBack}
      onClose={onClose}
      footer={
        <FlowFooter hint={step === "review" ? "Arezak cannot submit this transfer yet." : undefined}>
          {step === "review" ? (
            <FlowButton disabled>Live sending unavailable</FlowButton>
          ) : (
            <FlowButton type="submit" form="send-flow-form" disabled={
              (step === "recipient" && !recipientType) ||
              (step === "network" && !rail) ||
              (step === "amount" && !accountId)
            }>
              Continue
            </FlowButton>
          )}
        </FlowFooter>
      }
    >
      {step === "review" ? (
        <ReviewTransaction
          rows={[
            { label: "Recipient", value: reviewRecipient, strong: true },
            ...(recipientType === "mobile" ? [{ label: "Network", value: ghanaRailLabel(rail) }] : [{ label: "Recipient type", value: "Arezak user" }]),
            { label: "From", value: account?.name ?? "Arezak account" },
            { label: "Amount", value: pesewas ? formatGhs(pesewas) : "—", strong: true },
            { label: "Fee", value: "Unavailable" },
            { label: "Total debit", value: "Unavailable until a live fee quote is available", strong: true },
            ...(note.trim() ? [{ label: "Reference", value: note.trim() }] : []),
            { label: "Status", value: "Not submitted" },
          ]}
          notice={recipientType === "mobile"
            ? "No MTN, Telecel, or AirtelTigo provider is connected. This transfer has not been created and no balance will change."
            : "Recipient lookup and internal Arezak-to-Arezak transfers are not available yet. This transfer has not been created and no balance will change."}
        />
      ) : (
        <form id="send-flow-form" noValidate onSubmit={handleContinue} className="space-y-5">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {step === "recipient" && (
            <section className="space-y-3">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900">Who are you sending to?</h3>
                <p className="mt-1 text-sm text-slate-600">Choose where the recipient is registered.</p>
              </div>
              <ChoiceCard title="Arezak user" description="Send to an Arezak account. Recipient lookup is not connected yet." selected={recipientType === "arezak"} onClick={() => setRecipientType("arezak")} />
              <ChoiceCard title="Mobile money" description="Choose a receiving network, then enter the mobile number." selected={recipientType === "mobile"} onClick={() => setRecipientType("mobile")} />
            </section>
          )}
          {step === "network" && (
            <section className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Choose receiving network</h3>
                <p className="mt-1 text-sm text-slate-600">Select it directly. Arezak does not guess a network from the phone prefix.</p>
              </div>
              <NetworkSelector value={rail} onChange={setRail} />
            </section>
          )}
          {step === "details" && (
            <section className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Recipient details</h3>
                <p className="mt-1 text-sm text-slate-600">{recipientType === "mobile" ? `Receiving on ${ghanaRailLabel(rail)}.` : "No recipient search service is available yet."}</p>
              </div>
              {recipientType === "mobile" ? (
                <GhanaPhoneField value={recipient} onChange={setRecipient} label="Recipient mobile number" />
              ) : (
                <FlowField label="Arezak ID, email, or phone number" value={recipient} onChange={setRecipient} placeholder="Enter recipient identifier" autoComplete="off" />
              )}
              {recipientType === "arezak" && <FlowNotice>We cannot verify this recipient yet. No transfer will be submitted.</FlowNotice>}
            </section>
          )}
          {step === "amount" && (
            <section className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">How much?</h3>
                <p className="mt-1 text-sm text-slate-600">To {recipient}.</p>
              </div>
              <SourceSelector accounts={accounts} value={accountId} onChange={setAccountId} />
              <AmountInput value={amount} onChange={setAmount} availableBalance={account?.available_balance.amount_pesewas ?? 0} />
              <FlowField label="Reference or note (optional)" value={note} onChange={setNote} required={false} placeholder="Add a note" maxLength={120} />
              {pesewas !== null && !enoughBalance && <p role="alert" className="text-sm text-red-700">Amount exceeds this account’s available balance.</p>}
            </section>
          )}
        </form>
      )}
    </FinancialFlowShell>
  );
}
