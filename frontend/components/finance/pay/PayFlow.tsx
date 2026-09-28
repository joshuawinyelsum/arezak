"use client";

import React from "react";
import { ChoiceCard, FlowButton, FlowNotice } from "../FlowControls";
import { FlowFooter } from "../FlowFooter";
import { FinancialFlowShell } from "../FinancialFlowShell";

export function PayFlow({ onClose }: { onClose: () => void }) {
  return (
    <FinancialFlowShell
      title="Pay for a service"
      stepLabel="Choose a payment type"
      onClose={onClose}
      footer={<FlowFooter><FlowButton disabled>Payments coming soon</FlowButton></FlowFooter>}
    >
      <section className="space-y-3">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900">What would you like to pay for?</h3>
          <p className="mt-1 text-sm text-slate-600">Choose a service. We’ll collect only the details that service needs once it is connected.</p>
        </div>
        <ChoiceCard title="Airtime" description="Top up a mobile number" badge="Coming soon" disabled />
        <ChoiceCard title="Data" description="Choose a bundle for a mobile number" badge="Coming soon" disabled />
        <ChoiceCard title="Bills" description="Pay utilities and other bills" badge="Coming soon" disabled />
        <ChoiceCard title="Merchant" description="Pay a supported merchant" badge="Coming soon" disabled />
        <FlowNotice>No airtime, data, bill, or merchant payment provider is connected yet. No payment can be submitted.</FlowNotice>
      </section>
    </FinancialFlowShell>
  );
}
