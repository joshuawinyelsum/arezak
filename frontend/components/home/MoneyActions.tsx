"use client";

/**
 * MoneyActions — Four primary money intentions on Home.
 *
 * Actions are user INTENTIONS, not backend endpoints.
 * The user sees what they want to do; the modal handles the technical flow.
 *
 * Send    → money to another person
 * Fund    → money entering Arezak
 * Pay     → merchant / bill / service
 * Withdraw → money leaving Arezak (unavailable until a destination provider is connected)
 *
 * "Goal → Withdraw" (Protected → Available) is a DIFFERENT concept and lives
 * on the Goal detail page, not here.
 */

import React from "react";
import {
  Banknote,
  CreditCard,
  HandCoins,
  WalletCards,
} from "lucide-react";

interface MoneyActionsProps {
  hasAccount: boolean;
  onFund: () => void;
  onSend: () => void;
  onPay: () => void;
  onWithdraw: () => void;
}

const actions = [
  {
    key: "send" as const,
    label: "Send",
    description: "To someone",
    icon: HandCoins,
  },
  {
    key: "fund" as const,
    label: "Fund",
    description: "Add money",
    icon: WalletCards,
  },
  {
    key: "pay" as const,
    label: "Pay",
    description: "Bills & services",
    icon: CreditCard,
  },
  {
    key: "withdraw" as const,
    label: "Withdraw",
    description: "Cash out",
    icon: Banknote,
  },
];

export function MoneyActions({
  hasAccount,
  onFund,
  onSend,
  onPay,
  onWithdraw,
}: MoneyActionsProps) {
  const handlers: Record<string, () => void> = {
    fund: onFund,
    send: onSend,
    pay: onPay,
    withdraw: onWithdraw,
  };

  return (
    <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-4 md:gap-3">
      {actions.map((action) => {
        const disabled = !hasAccount;
        return (
          <button
            key={action.key}
            onClick={handlers[action.key]}
            disabled={disabled}
            aria-label={`${action.label}: ${action.description}`}
            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-28"
          >
            <action.icon className="h-5 w-5 text-brand" strokeWidth={1.8} aria-hidden="true" />
            <div className="text-center">
              <div className="font-semibold text-[13px] text-foreground">
                {action.label}
              </div>
              <div className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                {action.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

