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
    <div className="rounded-[28px] bg-gradient-to-br from-brand to-[#1a37a5] text-white p-6 md:p-8 relative overflow-hidden shadow-lg shadow-brand/20">
      <div className="relative z-10 flex flex-col gap-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
            Total Balance
          </span>
          <button
            onClick={onToggleBalance}
            className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
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
        <div className="text-[40px] md:text-[48px] leading-none font-bold tracking-tight">
          {fmt(totalSum)}
        </div>

        {/* Available / Protected breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/10">
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
              In goals
            </div>
          </div>
        </div>
      </div>

      {/* Decorative ring — purely visual, no meaning */}
      <div className="absolute -bottom-20 -right-20 opacity-[0.07] pointer-events-none">
        <div className="w-72 h-72 border-[50px] border-white rounded-full" />
      </div>
    </div>
  );
}
