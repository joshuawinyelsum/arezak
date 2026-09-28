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
    <section aria-labelledby="quick-pay-title" className="border-y border-slate-200 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="quick-pay-title" className="text-base font-semibold text-slate-900">Quick pay</h2>
        <span className="text-xs font-medium text-slate-500">Services coming soon</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
        {shortcuts.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={`${label}, coming soon`}
            className="flex min-h-14 items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Icon className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0"><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="block truncate text-xs text-slate-500">{description}</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}
