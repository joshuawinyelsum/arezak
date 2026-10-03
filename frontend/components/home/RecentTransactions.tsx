"use client";

/**
 * RecentTransactions — Human-readable transaction ledger for Home.
 *
 * Raw backend enum names (GOAL_CONTRIBUTION, TRANSFER_OUT, etc.) are
 * NEVER exposed to users. All display goes through the TransactionMapper.
 *
 * Unknown future transaction types hit the safe FALLBACK entry in the mapper.
 */

import React from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  ArrowRightLeft,
  Target,
  ShieldCheck,
  RefreshCw,
  Minus,
  CreditCard,
  ChevronRight,
  Receipt,
} from "lucide-react";
import { mapTransaction } from "@/lib/transactions/mapper";
import { formatPesewas } from "@/lib/money/format";

// Icon map keyed by the mapper's iconName field
const ICON_MAP: Record<string, React.ElementType> = {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  ArrowRightLeft,
  Target,
  ShieldCheck,
  RefreshCw,
  Minus,
  CreditCard,
};

interface Transaction {
  id: string;
  type: string;
  amount: { amount_pesewas: number; currency: string };
  status: string;
  description?: string;
  direction?: "INCOMING" | "OUTGOING";
  created_at: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  showBalance: boolean;
}

export function RecentTransactions({
  transactions,
  showBalance,
}: RecentTransactionsProps) {
  const recent = transactions.slice(0, 5);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-foreground">Recent Transactions</h2>
        <Link
          href="/transactions"
          className="flex items-center gap-0.5 text-xs text-brand font-medium hover:underline"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <Receipt className="w-8 h-8 text-slate-200" />
          <div>
            <p className="text-sm font-medium text-foreground">
              No transactions yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fund your account to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {recent.map((tx) => {
            const pres = mapTransaction(tx.type);
            const Icon = ICON_MAP[pres.iconName] ?? CreditCard;
            const isCredit = pres.direction === "credit" || tx.direction === "INCOMING";

            // Prefer a meaningful user description; fall back to the mapped label
            const label =
              tx.description && tx.description.trim().length > 0
                ? tx.description
                : pres.label;

            const dateStr = new Date(tx.created_at).toLocaleDateString(
              "en-GH",
              { day: "numeric", month: "short" }
            );

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-input"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {label}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {dateStr}
                    </div>
                  </div>
                </div>

                <div
                  className={`text-sm font-semibold ml-3 flex-shrink-0 ${
                    isCredit ? "text-green-600" : "text-card-foreground"
                  }`}
                >
                  {isCredit ? "+" : "−"}{" "}
                  {formatPesewas(tx.amount.amount_pesewas, !showBalance)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

