"use client";

import React, { useState, useEffect } from "react";
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch("/identity/me")
      .then((response) => response.json())
      .then((data: Identity) => { if (active) { setIdentity(data); } })
      .catch((err: any) => { if (active) setError(err.message || "Your receiving identity could not be loaded."); });
    return () => { active = false; };
  }, []);

  const getNormalizedHandle = (rawHandle: string | null) => {
    if (!rawHandle) return "";
    return rawHandle.startsWith("@") ? rawHandle : "@" + rawHandle;
  };

  const getPaymentDetailsText = (account: ReceivingAccount) => {
    return [
      Name: ,
      identity?.handle ? Handle:  : null,
      Arezak account number: 
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
    <div className="mx-auto w-full max-w-xl space-y-6 pb-12 animate-in fade-in duration-300">
      <header className="flex items-center gap-3">
        <button type="button" onClick={handleBack} aria-label="Back" className="rounded-full p-2 text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Receive money</h1>
      </header>

      {error && <p role="alert" className="rounded-xl border border-destructive-foreground/20 bg-destructive p-4 text-sm font-medium text-destructive-foreground">{error}</p>}
      {!identity && !error && <div className="py-12 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div></div>}
      
      {identity && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground px-1">Share your Arezak details to receive money.</p>
          
          {identity.accounts.map((account) => (
            <section key={account.account_id} className="rounded-[32px] border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-full mb-8">
                <div className="flex flex-col gap-4 text-left">
                  
                  <div className="border-b border-border pb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                    <p className="text-lg font-medium text-card-foreground">{identity.display_name}</p>
                  </div>
                  
                  {identity.handle && (
                    <div className="border-b border-border pb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Handle</p>
                      <p className="text-lg font-medium text-card-foreground">{getNormalizedHandle(identity.handle)}</p>
                    </div>
                  )}
                  
                  <div className="pb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Arezak account number</p>
                    <p className="font-mono text-3xl font-semibold tracking-wider text-foreground">{account.account_number}</p>
                  </div>

                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                <button type="button" onClick={() => handleCopy(account)} className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand text-white px-4 py-4 font-semibold hover:bg-brand/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card shadow-lg shadow-brand/20">
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  {copied ? "Copied" : "Copy payment details"}
                </button>
                
                <button type="button" onClick={() => handleShare(account)} className="w-full flex items-center justify-center gap-2 rounded-xl bg-muted text-card-foreground border border-border px-4 py-4 font-semibold hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                  Share
                </button>
              </div>

              <div className="mt-10 pt-10 border-t border-border w-full flex flex-col items-center">
                <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Or scan to pay</p>
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                  <QRCodeSVG value={account.qr_payload} size={160} level="Q" marginSize={0} />
                </div>
              </div>

            </section>
          ))}
        </div>
      )}
    </div>
  );
}



