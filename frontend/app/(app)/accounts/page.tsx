"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Wallet, ShieldCheck, Target, Lock, Eye, EyeOff, Loader2, AlertCircle, Plus, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Money = {
  amount_pesewas: number;
  currency: string;
};

type Account = {
  id: string;
  name: string;
  status: string;
  available_balance: Money;
  reserved_balance: Money;
  locked_balance: Money;
  total_balance: Money;
};

import { FundAccountModal } from "@/components/FundAccountModal";

export default function AccountsPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (err: any) {
      if (process.env.NODE_ENV === "development") console.error("Account data load failed", err);
      setError("Accounts couldn’t be loaded. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const formatPesewas = (pesewas: number) => {
    return (pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatMoney = (pesewas: number) => showBalance ? `GH₵ ${formatPesewas(pesewas)}` : "GH₵ ••••••••";
  const totalAvailable = accounts.reduce((sum, account) => sum + account.available_balance.amount_pesewas, 0);
  const totalProtected = accounts.reduce((sum, account) => sum + account.reserved_balance.amount_pesewas + account.locked_balance.amount_pesewas, 0);
  const totalMoney = accounts.reduce((sum, account) => sum + account.total_balance.amount_pesewas, 0);

  return (
    <div className="page-frame money-page pb-12">
      
      {/* Header */}
      <header className="page-heading">
        <div><p className="page-eyebrow">YOUR FINANCIAL CONTROL / MONEY</p><h1>Money</h1><p>See what is available, reserved, and protected.</p></div>
        <button onClick={() => setShowBalance(!showBalance)} aria-label={showBalance ? "Hide balances" : "Show balances"} className="balance-toggle">
           {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </header>

      {/* Action Bar */}
      {!isLoading && !error && accounts.length > 0 && (
        <div className="flex justify-end mt-2 mb-4">
          <button 
            onClick={() => {
              setSelectedAccountId(accounts[0].id);
              setShowFundModal(true);
            }}
            className="action-button"
          >
            <Plus size={16} /> Fund account
          </button>
        </div>
      )}

      {isLoading && (
        <div className="state-panel" role="status">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-sm font-medium">Loading your accounts...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="state-panel state-error">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="font-medium">Failed to load accounts</p>
          <p className="text-sm mt-1 opacity-80">{error}</p>
          <button 
            onClick={loadAccounts}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && accounts.length === 0 && (
        <div className="state-panel">
          <Wallet className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No accounts yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">You don&apos;t have any accounts set up.</p>
        </div>
      )}

      {!isLoading && !error && accounts.length > 0 && <>
        <section className="money-summary module">
          <div><span className="section-kicker">ACROSS {accounts.length} {accounts.length === 1 ? "ACCOUNT" : "ACCOUNTS"}</span><div className="money-total">{formatMoney(totalMoney)}</div><span className="money-caption">Total Balance</span></div>
          <div className="money-pools"><div><span>Available</span><b>{formatMoney(totalAvailable)}</b></div><div><span>Protected</span><b>{formatMoney(totalProtected)}</b></div></div>
        </section>
        <div className="account-list-heading"><div><span className="section-kicker">YOUR ACCOUNTS</span><h2>Money, organized</h2></div><span className="account-count">{accounts.length} {accounts.length === 1 ? "account" : "accounts"}</span></div>
        <div className="account-collection">{accounts.map((account) => <article key={account.id} className="account-module">
          <div className="account-top"><span className="account-glyph"><Wallet size={19} /></span><div className="account-ident"><h3>{account.name}</h3><span>{account.total_balance.currency} account</span></div><span className="account-status"><i /> {account.status}</span></div>
          <div className="account-balance-label">TOTAL BALANCE</div><div className="account-balance">{formatMoney(account.total_balance.amount_pesewas)}</div>
          <div className="account-breakdown"><div><span><Wallet size={14} /> Available</span><b>{formatMoney(account.available_balance.amount_pesewas)}</b></div><div><span><ShieldCheck size={14} /> Reserved</span><b>{formatMoney(account.reserved_balance.amount_pesewas)}</b></div><div><span><Target size={14} /> Locked for goals</span><b>{formatMoney(account.locked_balance.amount_pesewas)}</b></div></div>
          <Link href="/transactions" className="account-activity">View activity <ArrowUpRight size={14} /></Link>
        </article>)}</div>
      </>}

      {!isLoading && !error && accounts.length > 0 && (
        <div className="money-principle module">
          <div className="w-8 h-8 rounded-full bg-input flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Protected money stays protected</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Money assigned to goals or obligations stays separate from everyday spending. Arezak enforces that boundary when transactions are recorded.
              </p>
          </div>
        </div>
      )}

      <FundAccountModal 
        isOpen={showFundModal} 
        onClose={() => setShowFundModal(false)} 
        accountId={selectedAccountId} 
        onSuccess={() => {
          loadAccounts();
        }} 
      />
    </div>
  );
}


