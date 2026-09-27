/**
 * Transaction presentation mapper for Arezak.
 *
 * The backend stores raw TransactionType enum values (INCOME, GOAL_CONTRIBUTION, etc.).
 * These must NEVER be shown directly to the user. This module translates them into
 * human-facing labels, icons names, directional signs, and color hints.
 *
 * Adding a new backend transaction type?
 *   1. Add it to TRANSACTION_MAP below.
 *   2. The fallback entry at the bottom handles unknown types safely.
 */

export type TransactionPresentation = {
  /** Human-facing label shown in the UI */
  label: string;
  /** Whether this transaction increases (+) or decreases (-) the user's displayed balance */
  direction: "credit" | "debit" | "neutral";
  /** Lucide icon name to render (caller imports the icon) */
  iconName: string;
  /** Tailwind color class for the icon */
  color: string;
  /** Tailwind background class for the icon container */
  bg: string;
  /** Short description shown under the label */
  description: string;
};

const TRANSACTION_MAP: Record<string, TransactionPresentation> = {
  INCOME: {
    label: "Money Added",
    direction: "credit",
    iconName: "ArrowDownLeft",
    color: "text-green-600",
    bg: "bg-green-50",
    description: "Funds added to your account",
  },
  SPEND: {
    label: "Payment",
    direction: "debit",
    iconName: "ShoppingBag",
    color: "text-slate-500",
    bg: "bg-slate-50",
    description: "Payment made",
  },
  EXPENSE: {
    label: "Payment",
    direction: "debit",
    iconName: "ShoppingBag",
    color: "text-slate-500",
    bg: "bg-slate-50",
    description: "Payment made",
  },
  TRANSFER_OUT: {
    label: "Sent Money",
    direction: "debit",
    iconName: "ArrowUpRight",
    color: "text-blue-500",
    bg: "bg-blue-50",
    description: "Money sent",
  },
  TRANSFER: {
    label: "Transfer",
    direction: "neutral",
    iconName: "ArrowRightLeft",
    color: "text-blue-400",
    bg: "bg-blue-50",
    description: "Internal transfer",
  },
  WITHDRAW: {
    label: "Withdrawal",
    direction: "debit",
    iconName: "ArrowUpRight",
    color: "text-orange-500",
    bg: "bg-orange-50",
    description: "Withdrawn from Arezak",
  },
  GOAL_CONTRIBUTION: {
    label: "Added to Goal",
    direction: "neutral",
    iconName: "Target",
    color: "text-brand",
    bg: "bg-brand/10",
    description: "Money moved to a goal (still yours)",
  },
  GOAL_WITHDRAWAL: {
    label: "Withdrawn from Goal",
    direction: "neutral",
    iconName: "ShieldCheck",
    color: "text-green-600",
    bg: "bg-green-50",
    description: "Goal funds returned to available balance",
  },
  CORRECTION_APPLY: {
    label: "Correction",
    direction: "neutral",
    iconName: "RefreshCw",
    color: "text-slate-400",
    bg: "bg-slate-50",
    description: "Account correction applied",
  },
  CORRECTION_REVERSAL: {
    label: "Reversal",
    direction: "neutral",
    iconName: "RefreshCw",
    color: "text-slate-400",
    bg: "bg-slate-50",
    description: "Transaction reversed",
  },
  FEE: {
    label: "Fee",
    direction: "debit",
    iconName: "Minus",
    color: "text-red-400",
    bg: "bg-red-50",
    description: "Service fee",
  },
};

const FALLBACK: TransactionPresentation = {
  label: "Transaction",
  direction: "neutral",
  iconName: "CreditCard",
  color: "text-slate-400",
  bg: "bg-slate-50",
  description: "Financial activity",
};

export function mapTransaction(type: string): TransactionPresentation {
  return TRANSACTION_MAP[type] ?? FALLBACK;
}

export function isCredit(type: string): boolean {
  return mapTransaction(type).direction === "credit";
}

export function isDebit(type: string): boolean {
  return mapTransaction(type).direction === "debit";
}
