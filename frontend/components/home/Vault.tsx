"use client";

import React from "react";
import { Eye, EyeOff, ShieldCheck, Wallet } from "lucide-react";

interface VaultProps {
  totalSum: number;
  totalAvailable: number;
  totalProtected: number;
  totalReserved: number;
  totalLocked: number;
  showBalance: boolean;
  onToggleBalance: () => void;
  formatPesewas: (pesewas: number) => string;
}

export function Vault({
  totalSum,
  totalAvailable,
  totalProtected,
  totalReserved,
  totalLocked,
  showBalance,
  onToggleBalance,
  formatPesewas,
}: VaultProps) {
  const fmt = (n: number) => formatPesewas(n);

  return (
    <section aria-label="Account balances" className="vault-hero">
      <div className="vault-total-row">
        <div className="vault-total-label">TOTAL BALANCE</div>
        <button onClick={onToggleBalance} className="vault-visibility" aria-label={showBalance ? "Hide balance" : "Show balance"}>
          {showBalance ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      <div className="vault-total" aria-live="polite">{fmt(totalSum)}</div>
      <div className="vault-caption"><span className="vault-status-dot" />Available + Protected</div>
      <div className="vault-breakdown">
        <div className="vault-pool">
          <div className="vault-pool-label"><Wallet size={14} /> AVAILABLE</div>
          <div className="vault-pool-value">{fmt(totalAvailable)}</div>
          <div className="vault-pool-hint">Available to spend</div>
        </div>
        <div className="vault-pool protected">
          <div className="vault-pool-label"><ShieldCheck size={14} /> PROTECTED</div>
          <div className="vault-pool-value">{fmt(totalProtected)}</div>
          <div className="vault-pool-hint">Assigned to a purpose</div>
          <div className="vault-protected-breakdown"><span>Reserved <b>{fmt(totalReserved)}</b></span><span>Locked <b>{fmt(totalLocked)}</b></span></div>
        </div>
      </div>
    </section>
  );
}
