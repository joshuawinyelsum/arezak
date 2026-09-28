"use client";

import React from "react";
import { GHANA_RAILS, GhanaRail } from "./types";
import { ChoiceCard, FlowField } from "./FlowControls";

export function NetworkSelector({
  value,
  onChange,
}: {
  value: GhanaRail | null;
  onChange: (rail: GhanaRail) => void;
}) {
  return (
    <div className="space-y-2.5" role="group" aria-label="Choose receiving network">
      {GHANA_RAILS.map((rail) => (
        <ChoiceCard
          key={rail.value}
          title={rail.label}
          description="Select this network for the recipient. Number prefixes are not used to guess the carrier."
          badge="Coming soon"
          selected={value === rail.value}
          onClick={() => onChange(rail.value)}
        />
      ))}
    </div>
  );
}

export function GhanaPhoneField({
  value,
  onChange,
  label = "Mobile number",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <FlowField
      label={label}
      value={value}
      onChange={onChange}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="024 123 4567"
      hint="Enter a Ghana mobile number. The network is selected separately."
      maxLength={20}
    />
  );
}

export function BankDetailsFields({
  bank,
  account,
  onBankChange,
  onAccountChange,
}: {
  bank: string;
  account: string;
  onBankChange: (value: string) => void;
  onAccountChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <FlowField label="Bank name" value={bank} onChange={onBankChange} placeholder="Enter bank name" />
      <FlowField label="Account number" value={account} onChange={onAccountChange} inputMode="numeric" placeholder="Enter account number" autoComplete="off" />
    </div>
  );
}
