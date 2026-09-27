"use client";

/**
 * Arezak Home — Financial Command Center
 *
 * This is a COMPOSITION LAYER only.
 * No business logic, no financial calculations, no inline service definitions.
 *
 * Information hierarchy (locked):
 *   1. Vault          — Total Balance → Available + Protected
 *   2. MoneyActions   — Fund · Send · Pay · Withdraw
 *   3. PayAndBuy      — Everyday services (coming soon)
 *   4. GoalsPreview   — Core Arezak control mechanism
 *   5. RulesPreview   — Financial automation layer
 *   6. RecentActivity — Human-readable transaction ledger
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
import { PayAndBuy } from "@/components/home/PayAndBuy";
import { GoalsPreview } from "@/components/home/GoalsPreview";
import { RulesPreview } from "@/components/home/RulesPreview";
import { RecentTransactions } from "@/components/home/RecentTransactions";

// Modal components (existing, functional)
import { MoveMoneyModal } from "@/components/MoveMoneyModal";
import { FundAccountModal } from "@/components/FundAccountModal";

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

type ModalStep = "menu" | "send" | "pay" | "withdraw";

export default function Home() {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state — which action was tapped, and which account
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveModalStep, setMoveModalStep] = useState<ModalStep>("menu");

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
  const firstAccountId = data.accounts[0]?.id ?? "";

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleFund = () => {
    setSelectedAccountId(firstAccountId);
    setShowFundModal(true);
  };

  const openMoveModal = (step: ModalStep) => {
    setMoveModalStep(step);
    setShowMoveModal(true);
  };

  const handleRefresh = () => window.location.reload();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-500 pb-4 space-y-5">
      {/* ── Greeting ── */}
      <header className="pt-1">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Good morning, {firstName} 👋
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Here&apos;s your money summary.
        </p>
      </header>

      {/* ── Responsive layout ── */}
      {/*   Mobile: single column, items stack in priority order            */}
      {/*   Desktop (lg): two columns — left primary, right ecosystem       */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ╔══════════════════════════════════════╗
            ║  LEFT — Vault + Actions + Pay&Buy    ║
            ║  + Goals (mobile order)              ║
            ╚══════════════════════════════════════╝ */}
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

          {/* 2. MONEY ACTIONS — Fund · Send · Pay · Withdraw */}
          <MoneyActions
            hasAccount={data.accounts.length > 0}
            onFund={handleFund}
            onSend={() => openMoveModal("send")}
            onPay={() => openMoveModal("pay")}
            onWithdraw={() => openMoveModal("withdraw")}
          />

          {/* 3. PAY & BUY — Everyday services (coming soon) */}
          <PayAndBuy />

          {/* 4. GOALS — visible on mobile here (moves to right col on desktop) */}
          <div className="lg:hidden">
            <GoalsPreview goals={data.goals} formatPesewas={fmt} />
          </div>

        </div>

        {/* ╔══════════════════════════════════════╗
            ║  RIGHT — Goals · Rules · Activity    ║
            ╚══════════════════════════════════════╝ */}
        <div className="lg:col-span-5 flex flex-col gap-5">

          {/* Goals — desktop only (mobile version above) */}
          <div className="hidden lg:block">
            <GoalsPreview goals={data.goals} formatPesewas={fmt} />
          </div>

          {/* 5. RULES PREVIEW */}
          {/* Rules API doesn't exist yet — empty state communicates capability */}
          <RulesPreview rules={[]} />

          {/* 6. RECENT TRANSACTIONS — human-readable via TransactionMapper */}
          <RecentTransactions
            transactions={data.txs}
            showBalance={showBalance}
          />

        </div>
      </div>

      {/* ── Modals ── */}
      <FundAccountModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        accountId={selectedAccountId}
        onSuccess={handleRefresh}
      />

      <MoveMoneyModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onSuccess={handleRefresh}
        availableBalance={totalAvailable}
        accounts={data.accounts}
        initialStep={moveModalStep}
      />
    </div>
  );
}
