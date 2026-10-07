"use client";

import React from "react";
import { ArrowUpRight, Eye, EyeOff, LockKeyhole } from "lucide-react";

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
    <section aria-label="Account balances" className="vault-hero">
      <div className="vault-total-row">
        <div>
          <div className="vault-label-row">
            <div className="vault-total-label">Total Balance</div>
            <button onClick={onToggleBalance} className="vault-visibility" aria-label={showBalance ? "Hide balance" : "Show balance"}>
              {showBalance ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <div className="vault-total" aria-live="polite">{fmt(totalSum)}</div>
        </div>
      </div>
      <div className="vault-breakdown">
        <div className="vault-pool">
          <div className="vault-pool-label"><ArrowUpRight size={14} aria-hidden="true" /> Available</div>
          <div className="vault-pool-value">{fmt(totalAvailable)}</div>
        </div>
        <div className="vault-pool protected">
          <div className="vault-pool-label"><LockKeyhole size={13} aria-hidden="true" /> Protected</div>
          <div className="vault-pool-value">{fmt(totalProtected)}</div>
        </div>
      </div>
    </section>
  );
}
