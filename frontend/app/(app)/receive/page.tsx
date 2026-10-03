"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch } from "@/lib/api";
import Image from "next/image";

type ReceivingAccount = {
  account_id: string;
  account_name: string;
  account_number: string;
  qr_payload: string;
};
type Identity = {
  display_name: string;
  handle: string | null;
  email: string;
  phone_number: string | null;
  phone_verified: boolean;
  profile_photo_url: string | null;
  accounts: ReceivingAccount[];
};

export default function ReceivePage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch("/identity/me")
      .then((response) => response.json())
      .then((data: Identity) => { if (active) { setIdentity(data); } })
      .catch((err: any) => { if (active) setError(err.message || "Your receiving identity could not be loaded."); });
    return () => { active = false; };
  }, []);

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Copy is unavailable in this browser.");
    }
  };

  const shareIdentity = async (account: ReceivingAccount) => {
    const text = [
      `Arezak account: ${account.account_number}`,
      identity?.handle ?? "",
      `Receive with Arezak: ${account.qr_payload}`,
    ].filter(Boolean).join("\n");
    
    if (navigator.share) {
      try { await navigator.share({ title: "My Arezak account", text }); } catch {}
    } else {
      await copyValue(text, "Share details");
    }
  };

  const initials = identity?.display_name
    ? identity.display_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pb-12 animate-in fade-in duration-300">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Back" className="rounded-full p-2 text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Receive Money</h1>
      </header>

      {error && <p role="alert" className="rounded-xl border border-destructive-foreground/20 bg-destructive p-4 text-sm font-medium text-destructive-foreground">{error}</p>}
      {!identity && !error && <div className="py-12 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin"></div></div>}
      
      {identity && (
        <div className="space-y-6">
          <section className="rounded-[32px] border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center mb-5 overflow-hidden shadow-sm relative">
              {identity.profile_photo_url ? (
                <Image src={identity.profile_photo_url} alt="Profile" fill className="object-cover" unoptimized />
              ) : (
                <span className="text-3xl font-bold text-brand">{initials}</span>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-card-foreground">{identity.display_name}</h2>
            {identity.handle && <p className="text-sm font-semibold text-brand mt-1.5">{identity.handle}</p>}
            {identity.phone_verified && identity.phone_number && (
              <p className="text-sm text-muted-foreground mt-1.5">{identity.phone_number}</p>
            )}
            
            {identity.accounts.map((account) => (
              <div key={account.account_id} className="mt-8 w-full border-t border-border pt-8">
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 inline-block">
                    {/* The QR code needs a white background even in dark mode for scanner compatibility */}
                    <QRCodeSVG value={account.qr_payload} size={220} level="Q" marginSize={0} />
                  </div>
                  
                  <div className="w-full bg-input rounded-2xl p-5 mb-8 text-left border border-border">
                     <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Arezak Account Number</p>
                     <p className="font-mono text-2xl font-semibold tracking-[0.1em] text-foreground">{account.account_number}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button type="button" onClick={() => copyValue(account.account_number, "Account")} className="flex items-center justify-center gap-2 rounded-xl bg-foreground text-background px-4 py-4 text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
                      {copied === "Account" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied === "Account" ? "Copied!" : "Copy Acct No."}
                    </button>
                    {identity.handle ? (
                      <button type="button" onClick={() => copyValue(identity.handle!, "Handle")} className="flex items-center justify-center gap-2 rounded-xl bg-muted border border-border px-4 py-4 text-sm font-semibold text-card-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
                        {copied === "Handle" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied === "Handle" ? "Copied!" : "Copy Handle"}
                      </button>
                    ) : (
                      <button type="button" onClick={() => shareIdentity(account)} className="flex items-center justify-center gap-2 rounded-xl bg-muted border border-border px-4 py-4 text-sm font-semibold text-card-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
                        <Share2 className="h-4 w-4" /> Share
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
