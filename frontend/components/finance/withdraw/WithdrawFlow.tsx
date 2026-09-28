"use client";

import React, { useMemo, useState } from "react";
import { AmountInput, ChoiceCard, FlowButton, FlowField } from "../FlowControls";
import { FlowFooter } from "../FlowFooter";
import { FinancialFlowShell } from "../FinancialFlowShell";
import { BankDetailsFields, GhanaPhoneField, NetworkSelector } from "../DestinationSelector";
import { SourceSelector } from "../SourceSelector";
import { ReviewTransaction } from "../ReviewTransaction";
import { formatGhs, normalizeGhanaPhone, parsePesewas } from "../money";
import { GhanaRail, ghanaRailLabel, MoneyAccount } from "../types";

type WithdrawStep = "destination" | "network" | "details" | "amount" | "review";
type Destination = "mobile" | "bank";

export function WithdrawFlow({ accounts, onClose }: { accounts: MoneyAccount[]; onClose: () => void }) {
  const [step, setStep] = useState<WithdrawStep>("destination");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [rail, setRail] = useState<GhanaRail | null>(null);
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const account = useMemo(() => accounts.find((item) => item.id === accountId), [accounts, accountId]);
  const pesewas = parsePesewas(amount);
  const enoughBalance = pesewas !== null && pesewas <= (account?.available_balance.amount_pesewas ?? 0);

  const back = () => {
    setError(null);
    if (step === "review") setStep("amount");
    else if (step === "amount") setStep("details");
    else if (step === "details") setStep(destination === "mobile" ? "network" : "destination");
    else if (step === "network") setStep("destination");
    else onClose();
  };

  const next = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (step === "destination") {
      if (destination) setStep(destination === "mobile" ? "network" : "details");
    } else if (step === "network") {
      if (rail) setStep("details");
    } else if (step === "details") {
      if (destination === "mobile" && !normalizeGhanaPhone(phone)) {
        setError("Enter a valid Ghana mobile number.");
        return;
      }
      if (destination === "bank" && (!bank.trim() || !bankAccount.trim())) {
        setError("Enter the bank name and account number.");
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

  const destinationLabel = destination === "mobile" ? `${ghanaRailLabel(rail)} · ${normalizeGhanaPhone(phone) ?? phone}` : `${bank} · ${bankAccount}`;
  const labels: Record<WithdrawStep, string> = { destination: "1 · Destination", network: "2 · Network", details: destination === "mobile" ? "3 · Mobile number" : "2 · Bank details", amount: destination === "mobile" ? "4 · Amount" : "3 · Amount", review: "Review · Not submitted" };

  return (
    <FinancialFlowShell title="Withdraw" stepLabel={labels[step]} onBack={step === "destination" ? undefined : back} onClose={onClose}
      footer={<FlowFooter hint={step === "review" ? "No withdrawal will be submitted." : undefined}>{step === "review" ? <FlowButton disabled>Withdrawal unavailable</FlowButton> : <FlowButton type="submit" form="withdraw-flow-form" disabled={(step === "destination" && !destination) || (step === "network" && !rail) || (step === "amount" && !accountId)}>{step === "amount" ? "Review withdrawal" : "Continue"}</FlowButton>}</FlowFooter>}>
      {step === "review" ? (
        <ReviewTransaction rows={[
          { label: "From", value: account?.name ?? "Arezak account" },
          { label: "To", value: destinationLabel, strong: true },
          { label: "Amount", value: pesewas ? formatGhs(pesewas) : "—", strong: true },
          { label: "Fee", value: "Unavailable" },
          { label: "Total debit", value: "Unavailable until a live fee quote is available", strong: true },
          { label: "Status", value: "Not submitted" },
        ]} notice="No bank or mobile money withdrawal provider is connected. This request has not been created and no balance will change." />
      ) : (
        <form id="withdraw-flow-form" noValidate onSubmit={next} className="space-y-5">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {step === "destination" && <section className="space-y-3">
            <div><h3 className="text-xl font-bold text-slate-900">Where should the money go?</h3><p className="mt-1 text-sm text-slate-600">Choose a destination to see the details needed.</p></div>
            <ChoiceCard title="Mobile money" description="Choose a network and enter the receiving number" badge="Coming soon" selected={destination === "mobile"} onClick={() => setDestination("mobile")} />
            <ChoiceCard title="Bank account" description="Enter the bank and account number" badge="Coming soon" selected={destination === "bank"} onClick={() => setDestination("bank")} />
            <ChoiceCard title="Other destination" description="No other withdrawal destination is supported yet" badge="Unavailable" disabled />
          </section>}
          {step === "network" && <section className="space-y-4"><div><h3 className="text-xl font-bold text-slate-900">Choose receiving network</h3><p className="mt-1 text-sm text-slate-600">Choose the network explicitly.</p></div><NetworkSelector value={rail} onChange={setRail} /></section>}
          {step === "details" && <section className="space-y-5">
            <div><h3 className="text-xl font-bold text-slate-900">Destination details</h3><p className="mt-1 text-sm text-slate-600">No payment request will be sent until a provider is connected.</p></div>
            {destination === "mobile" ? <GhanaPhoneField value={phone} onChange={setPhone} label="Receiving mobile number" /> : <BankDetailsFields bank={bank} account={bankAccount} onBankChange={setBank} onAccountChange={setBankAccount} />}
          </section>}
          {step === "amount" && <section className="space-y-5">
            <div><h3 className="text-xl font-bold text-slate-900">How much will you withdraw?</h3><p className="mt-1 text-sm text-slate-600">To {destinationLabel}.</p></div>
            <SourceSelector accounts={accounts} value={accountId} onChange={setAccountId} />
            <AmountInput value={amount} onChange={setAmount} availableBalance={account?.available_balance.amount_pesewas ?? 0} />
            {pesewas !== null && !enoughBalance && <p role="alert" className="text-sm text-red-700">Amount exceeds this account’s available balance.</p>}
          </section>}
        </form>
      )}
    </FinancialFlowShell>
  );
}
