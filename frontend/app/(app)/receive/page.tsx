"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch } from "@/lib/api";

type ReceivingAccount = {
  account_id: string;
  account_name: string;
  account_number: string;
  qr_payload: string;
};

type Identity = {
  display_name: string;
  handle: string | null;
  accounts: ReceivingAccount[];
};

export default function ReceivePage() {
  const router = useRouter();
  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push("/settings");
    }
  };
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadIdentity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/identity/me");
      setIdentity(await response.json());
    } catch (err) {
      console.error("Unable to load receiving identity", err);
      setError("Your receiving details couldn’t be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadIdentity(); }, [loadIdentity]);

  const getNormalizedHandle = (rawHandle: string | null) => {
    if (!rawHandle) return "";
    return rawHandle.startsWith("@") ? rawHandle : "@" + rawHandle;
  };

  const getPaymentDetailsText = (account: ReceivingAccount) => {
    return [
      `Name: ${identity?.display_name || ""}`,
      identity?.handle ? `Handle: ${getNormalizedHandle(identity.handle)}` : null,
      `Arezak account number: ${account.account_number}`
    ].filter(Boolean).join("\n");
  };

  const handleCopy = async (account: ReceivingAccount) => {
    try {
      await navigator.clipboard.writeText(getPaymentDetailsText(account));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy is unavailable in this browser.");
    }
  };

  const handleShare = async (account: ReceivingAccount) => {
    const text = getPaymentDetailsText(account);
    if (navigator.share) {
      try { await navigator.share({ title: "My Arezak payment details", text }); } catch {}
    } else {
      await handleCopy(account);
    }
  };

    return (
    <div className="page-frame receive-page pb-12">
      <header className="page-heading receive-heading">
        <button type="button" onClick={handleBack} aria-label="Back" className="rounded-full p-2 text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1>Receive money</h1>
      </header>

      {isLoading && <div className="state-panel" role="status"><span className="sr-only">Loading receiving details</span><div className="w-7 h-7 rounded-full border-2 border-brand border-t-transparent animate-spin" /></div>}
      {error && <div className="receive-error" role="alert"><p>{error}</p><button type="button" onClick={() => void loadIdentity()}>Try again</button></div>}
      
      {identity && (
        <div className="receive-account-list">
          {identity.accounts.length === 0 && <div role="status" className="state-panel">No receiving account is available yet.</div>}
          {identity.accounts.map((account) => (
            <section key={account.account_id} className="receive-account" aria-label={`${account.account_name} receiving details`}>
              <div className="receive-owner">
                <strong>{identity.display_name}</strong>
                {identity.handle && <span>{getNormalizedHandle(identity.handle)}</span>}
              </div>
              <div className="receive-number">
                <span>Arezak account number</span>
                <strong>{account.account_number}</strong>
              </div>
              <div className="receive-qr">
                <p>Scan to pay</p>
                <div><QRCodeSVG value={account.qr_payload} size={144} level="Q" marginSize={0} aria-label="Arezak receive QR code" /></div>
              </div>
              <div className="receive-actions">
                <button type="button" onClick={() => void handleCopy(account)}>
                  {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
                  {copied ? "Copied" : "Copy details"}
                </button>
                <button type="button" onClick={() => void handleShare(account)}><Share2 size={17} aria-hidden="true" />Share</button>
              </div>
              {error && <p className="receive-inline-error" role="alert">{error}</p>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

