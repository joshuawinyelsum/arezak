"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, BanknoteArrowUp, QrCode, Send, WalletCards, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { apiFetch } from "@/lib/api";
import type { MoneyAccount } from "@/components/finance/types";
import { FundAccountModal } from "@/components/FundAccountModal";
import { SendFlow } from "@/components/finance/send/SendFlow";
import { WithdrawFlow } from "@/components/finance/withdraw/WithdrawFlow";

type ActionFlow = "send" | "scan" | "withdraw" | null;

const actions = [
  { id: "send" as const, label: "Send Money", Icon: Send },
  { id: "receive" as const, label: "Receive Money", Icon: ArrowDownToLine },
  { id: "scan" as const, label: "Scan & Pay", Icon: QrCode },
  { id: "fund" as const, label: "Fund Account", Icon: WalletCards },
  { id: "withdraw" as const, label: "Withdraw", Icon: BanknoteArrowUp },
];

export function MoneyActionMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [flow, setFlow] = useState<ActionFlow>(null);
  const [fundAccountId, setFundAccountId] = useState("");
  const [fundOpen, setFundOpen] = useState(false);
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const actionRequest = useRef(0);
  const closeMenu = useCallback(() => {
    actionRequest.current += 1;
    setIsLoading(false);
    onClose();
  }, [onClose]);

  const choose = useCallback(async (action: (typeof actions)[number]["id"]) => {
    setError("");
    if (action === "receive") {
      closeMenu();
      router.push("/receive");
      return;
    }

    setIsLoading(true);
    const requestId = ++actionRequest.current;
    try {
      const response = await apiFetch("/accounts");
      if (requestId !== actionRequest.current) return;
      const loadedAccounts: MoneyAccount[] = await response.json();
      setAccounts(loadedAccounts);
      if (action === "fund") {
        if (!loadedAccounts[0]) {
          setError("Create an account before funding it.");
          return;
        }
        setFundAccountId(loadedAccounts[0].id);
        closeMenu();
        setFundOpen(true);
        return;
      }
      closeMenu();
      setFlow(action);
    } catch {
      if (requestId === actionRequest.current) setError("Accounts could not be loaded. Try again.");
    } finally {
      if (requestId === actionRequest.current) setIsLoading(false);
    }
  }, [closeMenu, router]);

  useEffect(() => {
    const handleQuickAction = (event: Event) => {
      const action = (event as CustomEvent<string>).detail;
      if (action === "send" || action === "fund") void choose(action);
    };
    window.addEventListener("arezak:quick-money-action", handleQuickAction);
    return () => window.removeEventListener("arezak:quick-money-action", handleQuickAction);
  }, [choose]);

  const closeFlow = () => setFlow(null);

  return <>
    <Modal
      open={open}
      ariaLabel="Money actions"
      onClose={closeMenu}
      closeOnBackdrop
      backdropClassName="money-actions-sheet-backdrop"
      panelClassName="money-actions-sheet"
    >
      <div className="money-actions-sheet-heading">
        <h2 id="money-actions-title">Money actions</h2>
        <button type="button" className="money-actions-close" onClick={onClose} aria-label="Close money actions">
          <X size={19} aria-hidden="true" />
        </button>
      </div>
      <div className="money-actions-list" aria-labelledby="money-actions-title">
        {actions.map(({ id, label, Icon }) => <button
          key={id}
          type="button"
          className="money-actions-item"
          onClick={() => void choose(id)}
          disabled={isLoading}
        >
          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </button>)}
      </div>
      {isLoading && <p className="money-actions-loading" role="status">Loading accounts…</p>}
      {error && <p className="money-actions-error" role="alert">{error}</p>}
    </Modal>

    {flow === "send" && <SendFlow accounts={accounts} onClose={closeFlow} />}
    {flow === "scan" && <SendFlow accounts={accounts} onClose={closeFlow} scanRequested />}
    {flow === "withdraw" && <WithdrawFlow accounts={accounts} onClose={closeFlow} />}
    <FundAccountModal
      isOpen={fundOpen}
      onClose={() => setFundOpen(false)}
      accountId={fundAccountId}
      onSuccess={() => window.dispatchEvent(new Event("arezak:money-updated"))}
    />
  </>;
}
