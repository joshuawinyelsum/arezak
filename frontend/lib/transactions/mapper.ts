/**
 * Transaction presentation mapper for Arezak.
 *
 * The backend stores raw TransactionType enum values (INCOME, GOAL_CONTRIBUTION, etc.).
 * These must NEVER be shown directly to the user. This module translates them into
 * human-facing labels, icon names, directional signs, and color hints.
 *
 * GOAL_RELEASE: Legacy/alias name for GOAL_WITHDRAWAL — covered here explicitly.
 *
 * Adding a new backend transaction type?
 *   1. Add it to TRANSACTION_MAP below.
 *   2. The FALLBACK entry handles unknown types safely.
 */

export type TransactionDirection = "credit" | "debit" | "neutral";

export type TransactionPresentation = {
  /** Human-facing label shown in the UI */
  label: string;
  /** Whether this transaction increases (+) or decreases (-) the user's displayed balance */
  direction: TransactionDirection;
  /** Lucide icon name to render (caller imports the icon) */
  iconName: string;
  /** Tailwind color class for the icon */
  color: string;
  /** Tailwind background class for the icon container */
  bg: string;
};

const TRANSACTION_MAP: Record<string, TransactionPresentation> = {
  INCOME: {
    label: "Money Added",
    direction: "credit",
    iconName: "ArrowDownLeft",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  SPEND: {
    label: "Payment",
    direction: "debit",
    iconName: "ShoppingBag",
    color: "text-slate-500",
    bg: "bg-slate-50",
  },
  EXPENSE: {
    label: "Payment",
    direction: "debit",
    iconName: "ShoppingBag",
    color: "text-slate-500",
    bg: "bg-slate-50",
  },
  TRANSFER_OUT: {
    label: "Sent Money",
    direction: "debit",
    iconName: "ArrowUpRight",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  TRANSFER: {
    label: "Transfer",
    direction: "neutral",
    iconName: "ArrowRightLeft",
    color: "text-blue-400",
    bg: "bg-blue-50",
  },
  WITHDRAW: {
    label: "Withdrawal",
    direction: "debit",
    iconName: "ArrowUpRight",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  GOAL_CONTRIBUTION: {
    label: "Added to Goal",
    direction: "neutral",
    iconName: "Target",
    color: "text-brand",
    bg: "bg-blue-50",
  },
  // Both names covered — backend uses GOAL_WITHDRAWAL, some older code may emit GOAL_RELEASE
  GOAL_WITHDRAWAL: {
    label: "Withdrawn from Goal",
    direction: "neutral",
    iconName: "ShieldCheck",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  GOAL_RELEASE: {
    label: "Withdrawn from Goal",
    direction: "neutral",
    iconName: "ShieldCheck",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  CORRECTION_APPLY: {
    label: "Account Correction",
    direction: "neutral",
    iconName: "RefreshCw",
    color: "text-slate-400",
    bg: "bg-slate-50",
  },
  CORRECTION_REVERSAL: {
    label: "Transaction Reversed",
    direction: "neutral",
    iconName: "RefreshCw",
    color: "text-slate-400",
    bg: "bg-slate-50",
  },
  FEE: {
    label: "Fee",
    direction: "debit",
    iconName: "Minus",
    color: "text-red-400",
    bg: "bg-red-50",
  },
};

/** Safe fallback for unknown/future backend transaction types */
const FALLBACK: TransactionPresentation = {
  label: "Transaction",
  direction: "neutral",
  iconName: "CreditCard",
  color: "text-slate-400",
  bg: "bg-slate-50",
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
