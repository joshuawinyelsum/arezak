import React from "react";
import { MoneyAccount } from "./types";
import { formatGhs } from "./money";

export function SourceSelector({
  accounts,
  value,
  onChange,
  label = "From account",
}: {
  accounts: MoneyAccount[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const id = React.useId();
  const selected = accounts.find((account) => account.id === value);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>{account.name}</option>
        ))}
      </select>
      {selected && <p className="mt-1.5 text-xs text-muted-foreground">Available {formatGhs(selected.available_balance.amount_pesewas)}</p>}
    </div>
  );
}

