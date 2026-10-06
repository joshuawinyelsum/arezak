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
    color: "text-success-foreground",
    bg: "bg-success/10",
  },
  SPEND: {
    label: "Payment",
    direction: "debit",
    iconName: "ShoppingBag",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  EXPENSE: {
    label: "Payment",
    direction: "debit",
    iconName: "ShoppingBag",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  TRANSFER_OUT: {
    label: "Sent Money",
    direction: "debit",
    iconName: "ArrowUpRight",
    color: "text-brand",
    bg: "bg-accent",
  },
  TRANSFER: {
    label: "Transfer",
    direction: "neutral",
    iconName: "ArrowRightLeft",
    color: "text-brand",
    bg: "bg-accent",
  },
  WITHDRAW: {
    label: "Withdrawal",
    direction: "debit",
    iconName: "ArrowUpRight",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  GOAL_CONTRIBUTION: {
    label: "Added to Goal",
    direction: "neutral",
    iconName: "Target",
    color: "text-brand",
    bg: "bg-accent",
  },
  // Both names covered — backend uses GOAL_WITHDRAWAL, some older code may emit GOAL_RELEASE
  GOAL_WITHDRAWAL: {
    label: "Withdrawn from Goal",
    direction: "neutral",
    iconName: "ShieldCheck",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  GOAL_RELEASE: {
    label: "Withdrawn from Goal",
    direction: "neutral",
    iconName: "ShieldCheck",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  CORRECTION_APPLY: {
    label: "Account Correction",
    direction: "neutral",
    iconName: "RefreshCw",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  CORRECTION_REVERSAL: {
    label: "Transaction Reversed",
    direction: "neutral",
    iconName: "RefreshCw",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  FEE: {
    label: "Fee",
    direction: "debit",
    iconName: "Minus",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

/** Safe fallback for unknown/future backend transaction types */
const FALLBACK: TransactionPresentation = {
  label: "Transaction",
  direction: "neutral",
  iconName: "CreditCard",
  color: "text-muted-foreground",
  bg: "bg-muted",
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
