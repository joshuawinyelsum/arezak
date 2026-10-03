"use client";

import React from "react";
import { ReceiptText, Smartphone, Store, Wifi } from "lucide-react";

export type PayShortcut = "airtime" | "data" | "bills" | "merchant";

const shortcuts: { id: PayShortcut; label: string; icon: React.ElementType; description: string }[] = [
  { id: "airtime", label: "Airtime", icon: Smartphone, description: "Mobile top-up" },
  { id: "data", label: "Data", icon: Wifi, description: "Bundles" },
  { id: "bills", label: "Bills", icon: ReceiptText, description: "Utilities and services" },
  { id: "merchant", label: "Merchant", icon: Store, description: "Merchant payment" },
];

export function QuickPay({ onSelect }: { onSelect: (service: PayShortcut) => void }) {
  return (
    <section aria-labelledby="quick-pay-title" className="border-y border-border py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="quick-pay-title" className="text-base font-semibold text-foreground">Quick pay</h2>
        <span className="text-xs font-medium text-muted-foreground">Services coming soon</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={`${label}, coming soon`}
            className="flex min-h-[76px] items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Icon className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0"><span className="block text-sm font-semibold text-foreground">{label}</span><span className="block truncate text-xs text-muted-foreground">{description}</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}

