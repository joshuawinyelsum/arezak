/**
 * Money formatting utilities for Arezak.
 *
 * All amounts in the system are stored as integer pesewas (1 GH₵= 100 pesewas).
 * These utilities translate raw pesewa integers into user-facing strings.
 *
 * Never format money as "GH₵..." using floating-point arithmetic without
 * going through this module — rounding errors will accumulate.
 */

export type Money = {
  amount_pesewas: number;
  currency: string;
};

/**
 * Format a pesewa integer as a user-facing GH₵string.
 * If `hidden` is true, the amount is replaced with bullet dots.
 */
export function formatPesewas(pesewas: number, hidden = false): string {
  if (hidden) return "GH₵••••••";
  const amount = pesewas / 100;
  return `GH₵${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a Money object as a user-facing string.
 */
export function formatMoney(money: Money, hidden = false): string {
  return formatPesewas(money.amount_pesewas, hidden);
}
