"use client";

import React from "react";
import { Eye, EyeOff, ShieldCheck, Wallet } from "lucide-react";

interface VaultProps {
  totalSum: number;
  totalAvailable: number;
  totalProtected: number;
  showBalance: boolean;
  onToggleBalance: () => void;
  formatPesewas: (pesewas: number) => string;
}

/**
 * Vault — the primary balance display for Arezak Home.
 *
 * Communicates the core mental model:
 *   Total Balance = Available + Protected
 *
 * "Total Balance" is the hero number. Available and Protected explain
 * where that money currently sits. Nothing more.
 */
export function Vault({
  totalSum,
  totalAvailable,
  totalProtected,
  showBalance,
  onToggleBalance,
  formatPesewas,
}: VaultProps) {
  const fmt = (n: number) => formatPesewas(n);

  return (
    <section aria-label="Account balances" className="rounded-2xl bg-brand-dark p-6 text-white shadow-sm md:p-8">
      <div className="relative z-10 flex flex-col gap-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
            Total Balance
          </span>
          <button
            onClick={onToggleBalance}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-card/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Hero amount */}
        <div className="text-[40px] font-bold leading-none tracking-tight tabular-nums md:text-[48px]">
          {fmt(totalSum)}
        </div>

        {/* Available / Protected breakdown */}
        <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="w-3 h-3 text-white/40" />
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
                Available
              </span>
            </div>
            <div className="text-lg md:text-xl font-semibold">
              {fmt(totalAvailable)}
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              Ready to use
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3 h-3 text-white/40" />
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
                Protected
              </span>
            </div>
            <div className="text-lg md:text-xl font-semibold">
              {fmt(totalProtected)}
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              Set aside
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

