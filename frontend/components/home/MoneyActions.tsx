"use client";

/**
 * MoneyActions — Four primary money intentions on Home.
 *
 * Actions are user INTENTIONS, not backend endpoints.
 * The user sees what they want to do; the modal handles the technical flow.
 *
 * Fund    → money entering Arezak
 * Send    → money to another person
 * Pay     → merchant / bill / service
 * Withdraw → money leaving Arezak (labeled as simulation until provider rails exist)
 *
 * "Goal → Withdraw" (Protected → Available) is a DIFFERENT concept and lives
 * on the Goal detail page, not here.
 */

import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Landmark,
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
    key: "fund" as const,
    label: "Fund",
    description: "Add money",
    icon: ArrowDownLeft,
    bg: "bg-green-50",
    color: "text-green-600",
    ringHover: "hover:ring-green-200",
  },
  {
    key: "send" as const,
    label: "Send",
    description: "To someone",
    icon: ArrowUpRight,
    bg: "bg-blue-50",
    color: "text-blue-600",
    ringHover: "hover:ring-blue-200",
  },
  {
    key: "pay" as const,
    label: "Pay",
    description: "Bills & services",
    icon: ShoppingBag,
    bg: "bg-orange-50",
    color: "text-orange-600",
    ringHover: "hover:ring-orange-200",
  },
  {
    key: "withdraw" as const,
    label: "Withdraw",
    description: "To wallet/bank",
    icon: Landmark,
    bg: "bg-purple-50",
    color: "text-purple-600",
    ringHover: "hover:ring-purple-200",
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
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      {actions.map((action) => {
        const disabled = action.key === "fund" ? !hasAccount : false;
        return (
          <button
            key={action.key}
            onClick={handlers[action.key]}
            disabled={disabled}
            className={`flex flex-col items-center justify-center gap-2 p-3 md:p-4 bg-white border border-slate-200 rounded-2xl transition-all group ring-2 ring-transparent ${action.ringHover} hover:border-transparent hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div
              className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center ${action.bg} group-hover:scale-105 transition-transform`}
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
            </div>
            <div className="text-center">
              <div className="font-semibold text-[13px] text-slate-900">
                {action.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 hidden md:block">
                {action.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
