"use client";

/**
 * Arezak Home — Phase 1 Foundation
 *
 * This is the composition layer for the Arezak dashboard.
 * Business logic belongs in lib/ modules. This file composes
 * pre-built sections into the page hierarchy.
 *
 * Information hierarchy (approved):
 *   1. Vault          — Total Balance → Available + Protected
 *   2. Actions        — Fund · Move Money (Phase 2 will expand these)
 *   3. Goals          — Core Arezak control mechanism
 *   4. Rules          — Financial automation (empty state for now)
 *   5. Recent Activity — Human-readable transaction ledger
 *
 * Phase 1 scope: presentation layer only.
 * No changes to: account calculations, goal accounting, ledger, constraint engine.
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  Wallet,
  Loader2,
  AlertCircle,
  Target,
  ArrowDownLeft,
  ShoppingBag,
  ArrowRightLeft,
  CreditCard,
  RefreshCw,
  Minus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { MoveMoneyModal } from "@/components/MoveMoneyModal";
import { FundAccountModal } from "@/components/FundAccountModal";
import { Vault } from "@/components/home/Vault";
import { mapTransaction } from "@/lib/transactions/mapper";
import { formatPesewas } from "@/lib/money/format";

// ─── Domain types (mirrors backend API responses) ────────────────────────────

type Money = {
  amount_pesewas: number;
  currency: string;
};

type Account = {
  id: string;
  name: string;
  total_balance: Money;
  available_balance: Money;
  locked_balance: Money;
  reserved_balance: Money;
};

type Transaction = {
  id: string;
  type: string;
  amount: Money;
  status: string;
  description?: string;
  created_at: string;
};

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked_amount: number;
  status: string;
};

// ─── Icon map for transaction types ──────────────────────────────────────────
// Driven by lib/transactions/mapper.ts iconName field.
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [data, setData] = useState<{
    accounts: Account[];
    txs: Transaction[];
    goals: Goal[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [accRes, txRes, goalRes] = await Promise.all([
          apiFetch("/accounts"),
          apiFetch("/transactions"),
          apiFetch("/goals"),
        ]);

        if (!accRes.ok || !txRes.ok || !goalRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const [accounts, txs, goals] = await Promise.all([
          accRes.json(),
          txRes.json(),
          goalRes.json(),
        ]);

        if (isMounted) setData({ accounts, txs, goals });
      } catch (err: unknown) {
        if (isMounted)
          setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <p className="text-base font-semibold text-slate-900">
          Unable to load dashboard
        </p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Balance aggregation ──────────────────────────────────────────────────
  // INVARIANT: totalSum === totalAvailable + totalProtected
  // Protected = locked_balance (goal-allocated) + reserved_balance (rule-reserved)
  let totalAvailable = 0;
  let totalProtected = 0;
  let totalSum = 0;

  data.accounts.forEach((acc) => {
    totalAvailable += acc.available_balance.amount_pesewas;
    totalProtected +=
      acc.locked_balance.amount_pesewas + acc.reserved_balance.amount_pesewas;
    totalSum += acc.total_balance.amount_pesewas;
  });

  // Formatter bound to showBalance toggle
  const fmt = (pesewas: number) => formatPesewas(pesewas, !showBalance);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const activeGoals = data.goals.filter(
    (g) => g.status === "ACTIVE" || g.status === "ACHIEVED"
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-500 pb-16 pt-2 space-y-8">
      {/* ── Page header ── */}
      <header className="flex flex-col gap-1 md:mt-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Good morning, {firstName} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Your money is working according to your rules.
        </p>
      </header>

      {/* ── Main two-column grid ── */}
      {/* Left: Vault + primary actions.  Right: ecosystem panels. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ╔══════════════════════════════╗
            ║  LEFT — Vault & Actions      ║
            ╚══════════════════════════════╝ */}
        <div className="lg:col-span-7 flex flex-col gap-5">

          {/* 1. Vault — Total Balance → Available + Protected */}
          <Vault
            totalSum={totalSum}
            totalAvailable={totalAvailable}
            totalProtected={totalProtected}
            showBalance={showBalance}
            onToggleBalance={() => setShowBalance((v) => !v)}
            formatPesewas={fmt}
          />

          {/* 2. Primary actions — Phase 2 will break this into Fund/Send/Pay/Transfer */}
          {/* Keeping two prominent buttons for Phase 1 checkpoint. */}
          <div className="grid grid-cols-2 gap-3">
            {data.accounts.length > 0 && (
              <button
                onClick={() => {
                  setSelectedAccountId(data.accounts[0].id);
                  setShowFundModal(true);
                }}
                className="flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-2xl p-5 hover:border-brand/30 hover:bg-brand/5 transition-all shadow-sm group"
              >
                <div className="w-11 h-11 rounded-full bg-brand/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Wallet className="w-5 h-5 text-brand" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-slate-900">
                    Fund
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Add money
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => setIsMoveMoneyOpen(true)}
              className="flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-2xl p-5 hover:border-brand/30 hover:bg-brand/5 transition-all shadow-sm group"
            >
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-5 h-5 text-slate-600" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm text-slate-900">
                  Move Money
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Send · Pay · Transfer
                </div>
              </div>
            </button>
          </div>

          {/* 3. Goals — core Arezak control mechanism */}
          <section className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-slate-900">Your Goals</h2>
              <Link
                href="/goals"
                className="text-xs text-brand font-medium hover:underline"
              >
                View all
              </Link>
            </div>

            {activeGoals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-900">
                  No goals yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
                  Create a goal to protect money for something that matters.
                </p>
                <Link
                  href="/goals/create"
                  className="inline-block mt-4 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover transition-colors"
                >
                  Create a goal
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {activeGoals.slice(0, 3).map((goal) => {
                  const progress =
                    goal.target_amount > 0
                      ? Math.min(
                          Math.round(
                            (goal.current_amount / goal.target_amount) * 100
                          ),
                          100
                        )
                      : 0;
                  const isAchieved = goal.status === "ACHIEVED";

                  return (
                    <Link
                      href={`/goals/${goal.id}`}
                      key={goal.id}
                      className="block group"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-semibold text-sm text-slate-900 group-hover:text-brand transition-colors">
                          {goal.name}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAchieved && (
                            <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Achieved
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-500">
                            {progress}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isAchieved ? "bg-green-500" : "bg-brand"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400">
                        {fmt(goal.current_amount)} of {fmt(goal.target_amount)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ╔══════════════════════════════╗
            ║  RIGHT — Ecosystem panels    ║
            ╚══════════════════════════════╝ */}
        <div className="lg:col-span-5 flex flex-col gap-5">

          {/* 4. Money Rules — financial automation (empty state for Phase 1) */}
          <section className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-slate-900">Money Rules</h2>
              <Link
                href="/rules"
                className="text-xs text-brand font-medium hover:underline"
              >
                Manage
              </Link>
            </div>
            <div className="text-center py-6">
              <ShieldCheck className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">
                No active rules
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                Automatically organise your money as it comes in.
              </p>
            </div>
          </section>

          {/* 5. Recent Activity — human-readable ledger via TransactionMapper */}
          <section className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-slate-900">Recent Activity</h2>
              <Link
                href="/transactions"
                className="text-xs text-brand font-medium hover:underline"
              >
                View all
              </Link>
            </div>

            {data.txs.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                No recent transactions
              </div>
            ) : (
              <div className="space-y-5">
                {data.txs.slice(0, 5).map((tx) => {
                  const pres = mapTransaction(tx.type);
                  const Icon = ICON_MAP[pres.iconName] ?? CreditCard;
                  const isCredit = pres.direction === "credit";

                  // User-facing label: prefer the description if meaningful
                  const label =
                    tx.description && tx.description.trim().length > 0
                      ? tx.description
                      : pres.label;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${pres.bg}`}
                        >
                          <Icon className={`w-4 h-4 ${pres.color}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {label}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString(
                              "en-GH",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-sm font-semibold ${
                          isCredit ? "text-green-600" : "text-slate-700"
                        }`}
                      >
                        {isCredit ? "+" : "−"}{" "}
                        {formatPesewas(
                          tx.amount.amount_pesewas,
                          !showBalance
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Modals ── */}
      <FundAccountModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        accountId={selectedAccountId}
        onSuccess={() => window.location.reload()}
      />

      <MoveMoneyModal
        isOpen={isMoveMoneyOpen}
        onClose={() => setIsMoveMoneyOpen(false)}
        onSuccess={() => window.location.reload()}
        availableBalance={totalAvailable}
        accounts={data?.accounts ?? []}
      />
    </div>
  );
}
