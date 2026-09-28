"use client";

import React, { useMemo, useState } from "react";
import { AmountInput, ChoiceCard, FlowButton } from "../FlowControls";
import { FlowFooter } from "../FlowFooter";
import { FinancialFlowShell } from "../FinancialFlowShell";
import { BankDetailsFields, GhanaPhoneField, NetworkSelector } from "../DestinationSelector";
import { SourceSelector } from "../SourceSelector";
import { ReviewTransaction } from "../ReviewTransaction";
import { formatGhs, normalizeGhanaPhone, parsePesewas } from "../money";
import { GhanaRail, MoneyAccount } from "../types";

type FundStep = "source" | "network" | "details" | "amount" | "review";
type FundingSource = "bank" | "mobile";

export function FundFlow({ accounts, onClose }: { accounts: MoneyAccount[]; onClose: () => void }) {
  const [step, setStep] = useState<FundStep>("source");
  const [source, setSource] = useState<FundingSource | null>(null);
  const [rail, setRail] = useState<GhanaRail | null>(null);
  const [bank, setBank] = useState("");
  const [sourceAccount, setSourceAccount] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const account = useMemo(() => accounts.find((item) => item.id === accountId), [accounts, accountId]);
  const pesewas = parsePesewas(amount);

  const back = () => {
    setError(null);
    if (step === "review") setStep("amount");
    else if (step === "amount") setStep("details");
    else if (step === "details") setStep(source === "mobile" ? "network" : "source");
    else if (step === "network") setStep("source");
    else onClose();
  };

  const next = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (step === "source") {
      if (source) setStep(source === "mobile" ? "network" : "details");
    } else if (step === "network") {
      if (rail) setStep("details");
    } else if (step === "details") {
      if (source === "mobile" && !normalizeGhanaPhone(phone)) {
        setError("Enter a valid Ghana mobile number.");
        return;
      }
      if (source === "bank" && (!bank.trim() || !sourceAccount.trim())) {
        setError("Enter the bank name and account number.");
        return;
      }
      setStep("amount");
    } else if (step === "amount") {
      if (!pesewas) {
        setError("Enter an amount greater than GH₵0.00, using up to two decimal places.");
        return;
      }
      setStep("review");
    }
  };

  const sourceLabel = source === "mobile" ? `${rail ? rail.replaceAll("_", " ") : "Mobile money"} · ${normalizeGhanaPhone(phone) ?? phone}` : `${bank} · ${sourceAccount}`;
  const labels: Record<FundStep, string> = { source: "1 · Funding source", network: "2 · Network", details: source === "mobile" ? "3 · Mobile number" : "2 · Bank details", amount: source === "mobile" ? "4 · Amount" : "3 · Amount", review: "Review · Not submitted" };

  return (
    <FinancialFlowShell title="Fund account" stepLabel={labels[step]} onBack={step === "source" ? undefined : back} onClose={onClose}
      footer={<FlowFooter hint={step === "review" ? "External funding is not connected." : undefined}>{step === "review" ? <FlowButton disabled>Funding unavailable</FlowButton> : <FlowButton type="submit" form="fund-flow-form" disabled={(step === "source" && !source) || (step === "network" && !rail)}>{step === "amount" ? "Review funding" : "Continue"}</FlowButton>}</FlowFooter>}>
      {step === "review" ? (
        <ReviewTransaction rows={[
          { label: "From", value: sourceLabel, strong: true },
          { label: "To", value: account?.name ?? "Arezak account" },
          { label: "Amount", value: pesewas ? formatGhs(pesewas) : "—", strong: true },
          { label: "Fee", value: "Unavailable" },
          { label: "Amount to receive", value: "Unavailable until a live fee quote is available", strong: true },
          { label: "Status", value: "Not submitted" },
        ]} notice="No bank or mobile money funding provider is connected. No deposit will be requested and no Arezak balance will change." />
      ) : (
        <form id="fund-flow-form" noValidate onSubmit={next} className="space-y-5">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {step === "source" && <section className="space-y-3">
            <div><h3 className="text-xl font-bold text-slate-900">Where is the money coming from?</h3><p className="mt-1 text-sm text-slate-600">Choose a source to see what details are needed.</p></div>
            <ChoiceCard title="Bank account" description="Bank-to-Arezak funding · live bank connection unavailable" badge="Coming soon" selected={source === "bank"} onClick={() => setSource("bank")} />
            <ChoiceCard title="Mobile money" description="Choose a network and enter the sending number" badge="Coming soon" selected={source === "mobile"} onClick={() => setSource("mobile")} />
            <ChoiceCard title="Other source" description="No other funding source is supported yet" badge="Unavailable" disabled />
          </section>}
          {step === "network" && <section className="space-y-4"><div><h3 className="text-xl font-bold text-slate-900">Choose the sending network</h3><p className="mt-1 text-sm text-slate-600">Carrier is selected explicitly; Arezak does not infer it from the number.</p></div><NetworkSelector value={rail} onChange={setRail} /></section>}
          {step === "details" && <section className="space-y-5">
            <div><h3 className="text-xl font-bold text-slate-900">Funding details</h3><p className="mt-1 text-sm text-slate-600">These details are for the future provider flow; no payment request will be sent.</p></div>
            {source === "mobile" ? <GhanaPhoneField value={phone} onChange={setPhone} label="Sending mobile number" /> : <BankDetailsFields bank={bank} account={sourceAccount} onBankChange={setBank} onAccountChange={setSourceAccount} />}
            <SourceSelector accounts={accounts} value={accountId} onChange={setAccountId} label="Deposit into Arezak account" />
          </section>}
          {step === "amount" && <section className="space-y-5">
            <div><h3 className="text-xl font-bold text-slate-900">How much will you add?</h3><p className="mt-1 text-sm text-slate-600">From {sourceLabel}.</p></div>
            <AmountInput value={amount} onChange={setAmount} />
          </section>}
        </form>
      )}
    </FinancialFlowShell>
  );
}
