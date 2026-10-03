"use client";

import React, { useState } from "react";
import { CreditCard, Landmark, Smartphone } from "lucide-react";
import { FlowButton, FlowNotice } from "../FlowControls";
import { FlowFooter } from "../FlowFooter";
import { FinancialFlowShell } from "../FinancialFlowShell";
import { GhanaRail, ghanaRailLabel, GHANA_RAILS } from "../types";

type FundingMethod = "bank" | "debit" | "credit" | null;

export function FundFlow({ onClose }: { onClose: () => void }) {
  const [rail, setRail] = useState<GhanaRail | null>(null);
  const [method, setMethod] = useState<FundingMethod>(null);
  const [showNetworks, setShowNetworks] = useState(false);

  const goBack = () => {
    if (showNetworks || method) {
      setShowNetworks(false);
      setMethod(null);
      setRail(null);
    } else {
      onClose();
    }
  };

  const selectedMethod = method === "bank"
    ? "Bank account"
    : method === "debit"
      ? "Debit card"
      : method === "credit"
        ? "Credit card"
        : rail ? ghanaRailLabel(rail) : undefined;

  return (
    <FinancialFlowShell
      title="Fund account"
      stepLabel={showNetworks ? "Mobile money" : method || rail ? "Source unavailable" : "Funding source"}
      onBack={showNetworks || method || rail ? goBack : undefined}
      onClose={onClose}
      footer={
        <FlowFooter>
          <FlowButton type="button" variant={showNetworks || method || rail ? "secondary" : "primary"} onClick={showNetworks || method || rail ? goBack : onClose}>
            {showNetworks || method || rail ? "Choose another source" : "Close"}
          </FlowButton>
        </FlowFooter>
      }
    >
      {!showNetworks && !method && !rail && (
        <section className="space-y-5">
          <div>
            <h3 className="text-xl font-bold text-foreground">Where is the money coming from?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Choose a funding source. Arezak will only request money through a connected provider.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile money</p>
            <button type="button" onClick={() => setShowNetworks(true)} className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-card px-4 text-left hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <Smartphone className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1"><span className="block font-semibold text-foreground">Choose a mobile money network</span><span className="mt-0.5 block text-sm text-muted-foreground">MTN MoMo, Telecel Cash, or AT Money</span></span>
              <span className="rounded-full bg-input px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Coming soon</span>
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bank</p>
            <FundingMethodButton icon={Landmark} label="Bank account" onClick={() => setMethod("bank")} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Card</p>
            <FundingMethodButton icon={CreditCard} label="Debit card" onClick={() => setMethod("debit")} />
            <FundingMethodButton icon={CreditCard} label="Credit card" onClick={() => setMethod("credit")} />
          </div>
        </section>
      )}

      {showNetworks && !rail && (
        <section className="space-y-4">
          <div><h3 className="text-xl font-bold text-foreground">Choose the sending network</h3><p className="mt-1 text-sm text-muted-foreground">Select the network directly; Arezak does not guess from the number.</p></div>
          {GHANA_RAILS.map((item) => (
            <button key={item.value} type="button" onClick={() => setRail(item.value)} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <span className="font-semibold text-foreground">{item.label}</span><span className="rounded-full bg-input px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Coming soon</span>
            </button>
          ))}
          <FlowNotice>No mobile money funding provider is connected. Selecting a network will not initiate a payment.</FlowNotice>
        </section>
      )}

      {(method || rail) && (
        <section className="space-y-4">
          <div><h3 className="text-xl font-bold text-foreground">{selectedMethod} funding is coming soon</h3><p className="mt-1 text-sm text-muted-foreground">This source is not connected to Arezak yet.</p></div>
          <FlowNotice>{selectedMethod} is unavailable. No account or card details are collected, no provider is contacted, and your Arezak balance will not change.</FlowNotice>
        </section>
      )}
    </FinancialFlowShell>
  );
}

function FundingMethodButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-4 text-left hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
      <span className="flex-1 font-semibold text-foreground">{label}</span>
      <span className="rounded-full bg-input px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Coming soon</span>
    </button>
  );
}

