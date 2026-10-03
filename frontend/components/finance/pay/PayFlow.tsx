"use client";

import React, { useState } from "react";
import { FlowButton, FlowNotice } from "../FlowControls";
import { FlowFooter } from "../FlowFooter";
import { FinancialFlowShell } from "../FinancialFlowShell";
import type { PayShortcut } from "../../home/QuickPay";

const paymentServices: { id: PayShortcut; label: string; detail: string }[] = [
  { id: "airtime", label: "Airtime", detail: "Top up your number or someone else’s." },
  { id: "data", label: "Data", detail: "Choose a bundle and recipient number." },
  { id: "bills", label: "Bills", detail: "Pay a utility or service bill." },
  { id: "merchant", label: "Merchant", detail: "Pay a supported merchant." },
];

export function PayFlow({ onClose, initialService }: { onClose: () => void; initialService?: PayShortcut }) {
  const [selected, setSelected] = useState<PayShortcut | null>(initialService ?? null);
  const selectedService = paymentServices.find((item) => item.id === selected);

  return (
    <FinancialFlowShell
      title="Pay"
      stepLabel={selectedService ? `${selectedService.label} · Unavailable` : "Payment services"}
      onBack={selectedService ? () => setSelected(null) : undefined}
      onClose={onClose}
      footer={<FlowFooter><FlowButton disabled>{selectedService ? `${selectedService.label} coming soon` : "Payments coming soon"}</FlowButton></FlowFooter>}
    >
      {selectedService ? (
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{selectedService.label}</p>
            <h3 className="mt-2 text-xl font-bold text-foreground">This service is not connected yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">{selectedService.detail}</p>
          </div>
          <FlowNotice>No provider is connected for this payment. No payment details are collected and no transaction will be submitted.</FlowNotice>
          <button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">View all payment services</button>
        </section>
      ) : (
        <section className="space-y-1">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-foreground">What would you like to pay for?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Choose a service to see its current availability.</p>
          </div>
          {paymentServices.map((service) => (
            <button key={service.id} type="button" onClick={() => setSelected(service.id)} className="flex min-h-16 w-full items-center justify-between gap-4 rounded-lg border-b border-slate-100 px-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <span><span className="block font-semibold text-foreground">{service.label}</span><span className="mt-0.5 block text-sm text-muted-foreground">{service.detail}</span></span>
              <span className="shrink-0 rounded-full bg-input px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Coming soon</span>
            </button>
          ))}
          <p className="pt-3 text-sm text-muted-foreground">Airtime, data, bills, and merchant payments are unavailable until a provider is connected.</p>
        </section>
      )}
    </FinancialFlowShell>
  );
}

