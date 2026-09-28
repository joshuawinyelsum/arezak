"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  email: string;
  phone_number: string | null;
  phone_verified: boolean;
  accounts: ReceivingAccount[];
};

export default function ReceivePage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [handleValue, setHandleValue] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch("/identity/me")
      .then((response) => response.json())
      .then((data: Identity) => { if (active) { setIdentity(data); setHandleValue(data.handle?.replace(/^@/, "") ?? ""); } })
      .catch(() => { if (active) setError("Your receiving identity could not be loaded."); });
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
      try { await navigator.share({ title: "My Arezak account", text }); } catch { /* user dismissed share sheet */ }
    } else {
      await copyValue(text, "Share details");
    }
  };

  const updateHandle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSavingHandle(true);
    try {
      const response = await apiFetch("/identity/handle", {
        method: "PATCH",
        body: JSON.stringify({ handle: handleValue }),
      });
      const updated: Identity = await response.json();
      setIdentity(updated);
      setHandleValue(updated.handle?.replace(/^@/, "") ?? "");
    } catch {
      setError("That handle could not be saved. Choose 3–30 letters, numbers, or underscores; it may already be taken.");
    } finally {
      setSavingHandle(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-8">
      <header className="flex items-center gap-3">
        <Link href="/settings" aria-label="Back to More" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-sm text-slate-500">Your Arezak identity</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Receive money</h1>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!identity && !error && <p role="status" className="py-8 text-center text-sm text-slate-500">Loading your receiving details…</p>}
      {identity && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Arezak identity</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{identity.display_name}</h2>
            <p className="mt-1 text-sm text-slate-700">{identity.handle ?? "Handle not set"}</p>
            <p className="mt-1 text-sm text-slate-500">{identity.phone_verified && identity.phone_number ? identity.phone_number : "Verified phone discovery is not set up yet"}</p>
            <form onSubmit={updateHandle} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="arezak-handle" className="sr-only">Your Arezak handle</label>
              <div className="flex min-h-11 flex-1 items-center rounded-lg border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-brand">
                <span className="text-slate-500">@</span>
                <input id="arezak-handle" value={handleValue} onChange={(event) => setHandleValue(event.target.value.replace(/^@/, ""))} minLength={3} maxLength={30} pattern="[A-Za-z0-9_]{3,30}" autoComplete="username" placeholder="choose a handle" className="min-w-0 flex-1 bg-transparent px-2 text-base text-slate-900 outline-none" />
              </div>
              <button type="submit" disabled={savingHandle || !handleValue} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{savingHandle ? "Saving…" : "Save handle"}</button>
            </form>
            <p className="mt-1 text-xs text-slate-500">Handles are public recipient identifiers. Changing one updates how others find you.</p>
          </section>

          {identity.accounts.map((account) => (
            <section key={account.account_id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Arezak account</p>
                <p className="mt-1 text-sm text-slate-600">{account.account_name}</p>
                <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.12em] text-slate-900">{account.account_number}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copyValue(account.account_number, "Account number")} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                  {copied === "Account number" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied === "Account number" ? "Copied" : "Copy account number"}
                </button>
                {identity.handle && <button type="button" onClick={() => copyValue(identity.handle!, "Handle")} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {copied === "Handle" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied === "Handle" ? "Copied" : "Copy handle"}
                </button>}
                <button type="button" onClick={() => void shareIdentity(account)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <Share2 className="h-4 w-4" aria-hidden="true" /> Share
                </button>
              </div>
              <div className="flex flex-col items-center border-t border-slate-100 pt-5">
                <QRCodeSVG value={account.qr_payload} size={208} level="Q" marginSize={2} title="Arezak receiving QR code" aria-label="Arezak receiving QR code" />
                <p className="mt-3 text-center text-xs text-slate-500">This code shares an opaque receiving identity. It does not contain your balance or personal contact details.</p>
              </div>
            </section>
          ))}
          {identity.accounts.length === 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No active account is available for receiving money.</p>}
        </>
      )}
    </div>
  );
}
