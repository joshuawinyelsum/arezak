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
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
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
  const [retryCount, setRetryCount] = useState(0);

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
      setError(null);
      setIsLoading(true);
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
        if (process.env.NODE_ENV === "development") console.error("Dashboard data load failed", err);
        if (mounted)
          setError("Your financial overview couldn’t be loaded.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user, retryCount]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-frame home-loading" role="status" aria-live="polite">
        <div className="page-eyebrow">FINANCIAL CONTROL / HOME</div><div className="skeleton-line wide" /><div className="skeleton-hero" /><div className="skeleton-row"><span /><span /><span /><span /></div>
        <span className="sr-only"><Loader2 className="animate-spin" />Loading your financial overview</span>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="page-frame state-panel">
        <div className="state-symbol"><AlertCircle size={22} /></div>
        <p className="section-kicker">HOME / DATA STATUS</p><p className="text-base font-semibold text-foreground">Unable to load dashboard</p>
        <p className="text-sm mt-1 text-muted-foreground">{error || "Your financial overview isn’t available right now."}</p>
        <button
          onClick={() => setRetryCount((count) => count + 1)}
          className="action-button mt-5"
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
  let totalReserved = 0;
  let totalLocked = 0;
  let totalProtected = 0;
  let totalSum = 0;

  data.accounts.forEach((acc) => {
    totalAvailable += acc.available_balance.amount_pesewas;
    totalReserved += acc.reserved_balance.amount_pesewas;
    totalLocked += acc.locked_balance.amount_pesewas;
    totalProtected += acc.locked_balance.amount_pesewas + acc.reserved_balance.amount_pesewas;
    totalSum += acc.total_balance.amount_pesewas;
  });

  const fmt = (pesewas: number) => formatPesewas(pesewas, !showBalance);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-frame home-page pb-4">
      {/* ── Greeting ── */}
      <header className="page-heading home-heading">
        <div><p className="page-eyebrow">YOUR FINANCIAL CONTROL / HOME</p><h1>Your money, in view.</h1>
        <p>Available to spend. Protected for a purpose.</p></div>
        <Link href="/accounts" className="text-link home-money-link">Money details <ArrowRight size={15} /></Link>
      </header>

      {/* ── Responsive layout ── */}
      {/*   Mobile: single column, items stack in priority order            */}
      {/*   Desktop (lg): two columns — left primary, right ecosystem       */}
      <Vault
            totalSum={totalSum}
            totalAvailable={totalAvailable}
            totalProtected={totalProtected}
            totalReserved={totalReserved}
            totalLocked={totalLocked}
            showBalance={showBalance}
            onToggleBalance={() => setShowBalance((v) => !v)}
            formatPesewas={fmt}
          />

      <div className="home-layout">
        <div className="home-secondary">
          <div className="home-goals"><GoalsPreview goals={data.goals} formatPesewas={fmt} /></div>
          <div className="home-recent"><RecentTransactions transactions={data.txs} showBalance={showBalance} /></div>
        </div>
        <div className="home-primary">
          <section className="home-action-section" aria-labelledby="money-actions-title">
            <div className="home-section-heading"><div><span className="section-kicker">MONEY / ACTIONS</span><h2 id="money-actions-title">Money actions</h2></div></div>
            <MoneyActions
            hasAccount={data.accounts.length > 0}
            onFund={() => setActiveFlow("fund")}
            onSend={() => setActiveFlow("send")}
            onPay={() => { setPayService(null); setActiveFlow("pay"); }}
            onWithdraw={() => setActiveFlow("withdraw")}
            />
          </section>
          <QuickPay onSelect={(service) => { setPayService(service); setActiveFlow("pay"); }} />
        </div>
      </div>

      {activeFlow === "fund" && <FundFlow onClose={() => setActiveFlow(null)} />}
      {activeFlow === "send" && <SendFlow accounts={data.accounts} onClose={() => setActiveFlow(null)} />}
      {activeFlow === "pay" && <PayFlow initialService={payService ?? undefined} onClose={() => { setPayService(null); setActiveFlow(null); }} />}
      {activeFlow === "withdraw" && <WithdrawFlow accounts={data.accounts} onClose={() => setActiveFlow(null)} />}
    </div>
  );
}

