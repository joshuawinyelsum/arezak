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
    <section aria-label="Account balances" className="rounded-2xl bg-card p-6 text-foreground ring-1 ring-border/60 md:p-8">
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Total Balance
          </span>
          <button
            onClick={onToggleBalance}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="text-[40px] font-bold leading-none tracking-tight tabular-nums md:text-[48px]">
          {fmt(totalSum)}
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-divider pt-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Available
              </span>
            </div>
            <div className="text-lg md:text-xl font-semibold">
              {fmt(totalAvailable)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Ready to use
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Protected
              </span>
            </div>
            <div className="text-lg md:text-xl font-semibold">
              {fmt(totalProtected)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Set aside
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
