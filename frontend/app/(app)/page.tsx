"use client";

/**
 * Arezak Home — Financial Command Center
 *
 * This is a COMPOSITION LAYER only.
 * No business logic, no financial calculations, no inline service definitions.
 *
 * Information hierarchy (locked):
 *   1. Vault          — Total Balance → Available + Protected
 *   2. MoneyActions   — Send · Fund · Pay · Withdraw
 *   3. QuickPay       — Shortcuts into the Pay flow
 *   4. GoalsPreview   — Actual protected goal balances and progress
 *   5. RecentActivity — Human-readable transaction ledger
 *
 * Financial invariant preserved: Total = Available + Protected
 * Available = available_balance
 * Protected = locked_balance + reserved_balance
 *
 * This file does NOT modify backend, ledger, accounting, or constraint engine.
 */

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

// Home section components
import { Vault } from "@/components/home/Vault";
import { MoneyActions } from "@/components/home/MoneyActions";
import { GoalsPreview } from "@/components/home/GoalsPreview";
import { QuickPay, PayShortcut } from "@/components/home/QuickPay";
import { RecentTransactions } from "@/components/home/RecentTransactions";
import { FundFlow } from "@/components/finance/fund/FundFlow";
import { SendFlow } from "@/components/finance/send/SendFlow";
import { PayFlow } from "@/components/finance/pay/PayFlow";
import { WithdrawFlow } from "@/components/finance/withdraw/WithdrawFlow";

// Shared utilities
import { formatPesewas } from "@/lib/money/format";

// ─── Domain types (mirrors backend API responses) ─────────────────────────────

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
  direction?: "INCOMING" | "OUTGOING";
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

// ─── Component ────────────────────────────────────────────────────────────────

type ActiveFlow = "fund" | "send" | "pay" | "withdraw" | null;

export default function Home() {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(null);
  const [payService, setPayService] = useState<PayShortcut | null>(null);

  const [data, setData] = useState<{
    accounts: Account[];
    txs: Transaction[];
    goals: Goal[];
  } | null>(null);

  useEffect(() => {
    let mounted = true;
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

        if (mounted) setData({ accounts, txs, goals });
      } catch (err: unknown) {
        if (mounted)
          setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <p className="text-base font-semibold text-slate-900">Unable to load dashboard</p>
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

  // ── Balance aggregation ───────────────────────────────────────────────────
  // INVARIANT: totalSum = totalAvailable + totalProtected (verified in backend)
  // Available = available_balance  |  Protected = locked + reserved
  let totalAvailable = 0;
  let totalProtected = 0;
  let totalSum = 0;

  data.accounts.forEach((acc) => {
    totalAvailable += acc.available_balance.amount_pesewas;
    totalProtected += acc.locked_balance.amount_pesewas + acc.reserved_balance.amount_pesewas;
    totalSum += acc.total_balance.amount_pesewas;
  });

  const fmt = (pesewas: number) => formatPesewas(pesewas, !showBalance);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-500 pb-4 space-y-5">
      {/* ── Greeting ── */}
      <header className="pt-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
          Good morning, {firstName}
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Here&apos;s your money summary.
        </p>
      </header>

      {/* ── Responsive layout ── */}
      {/*   Mobile: single column, items stack in priority order            */}
      {/*   Desktop (lg): two columns — left primary, right ecosystem       */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Primary balance, actions, quick payment access, and goals. */}
        <div className="lg:col-span-7 flex flex-col gap-5">

          {/* 1. VAULT — Total Balance → Available + Protected */}
          <Vault
            totalSum={totalSum}
            totalAvailable={totalAvailable}
            totalProtected={totalProtected}
            showBalance={showBalance}
            onToggleBalance={() => setShowBalance((v) => !v)}
            formatPesewas={fmt}
          />

          {/* 2. MONEY ACTIONS — Send · Fund · Pay · Withdraw */}
          <MoneyActions
            hasAccount={data.accounts.length > 0}
            onFund={() => setActiveFlow("fund")}
            onSend={() => setActiveFlow("send")}
            onPay={() => { setPayService(null); setActiveFlow("pay"); }}
            onWithdraw={() => setActiveFlow("withdraw")}
          />

          <QuickPay onSelect={(service) => { setPayService(service); setActiveFlow("pay"); }} />

          {/* 3. GOALS — visible on mobile here (moves to right col on desktop) */}
          <div className="lg:hidden">
            <GoalsPreview goals={data.goals} formatPesewas={fmt} />
          </div>

        </div>

        {/* Goals and transaction history provide real account context. */}
        <div className="lg:col-span-5 flex flex-col gap-5">

          {/* Goals — desktop only (mobile version above) */}
          <div className="hidden lg:block">
            <GoalsPreview goals={data.goals} formatPesewas={fmt} />
          </div>

          {/* Recent meaningful activity from the transaction API. */}
          <RecentTransactions
            transactions={data.txs}
            showBalance={showBalance}
          />

        </div>
      </div>

      {activeFlow === "fund" && <FundFlow onClose={() => setActiveFlow(null)} />}
      {activeFlow === "send" && <SendFlow accounts={data.accounts} onClose={() => setActiveFlow(null)} />}
      {activeFlow === "pay" && <PayFlow initialService={payService ?? undefined} onClose={() => { setPayService(null); setActiveFlow(null); }} />}
      {activeFlow === "withdraw" && <WithdrawFlow accounts={data.accounts} onClose={() => setActiveFlow(null)} />}
    </div>
  );
}
