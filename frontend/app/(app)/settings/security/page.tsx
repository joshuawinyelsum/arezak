"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ChevronLeft, ChevronRight, Key, Shield, MonitorSmartphone, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SecurityPage() {
  const { logout } = useAuth();
  const router = useRouter();
  
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState(false);
  
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(false);
    try {
      const res = await apiFetch("/identity/security");
      setStatus(await res.json());
    } catch (error) {
      console.error("Unable to load security settings", error);
      setStatusError(true);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => { void fetchStatus(); }, [fetchStatus]);

  const hasGoogle = status?.connected_providers?.includes("google");

  return (
    <div className="page-frame security-page space-y-6 pb-12">
      <header className="page-heading"><div><h1>Account & security</h1><p>Sign-in methods and connected accounts.</p></div><button onClick={() => router.back()} aria-label="Back" className="balance-toggle"><ChevronLeft className="w-5 h-5" /></button></header>

      <div className="space-y-6">
        {statusError && <div role="alert" className="rounded-xl bg-muted p-4 text-sm"><p>Security settings couldn’t be loaded.</p><button type="button" onClick={() => void fetchStatus()} className="mt-2 font-semibold text-brand underline underline-offset-4">Try again</button></div>}
        <section className="security-group">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Key className="w-4 h-4" /> Password & Authentication
          </h2>
          <div className="security-rows">
             
             {/* Password Row */}
             <Link href="/settings/security/password" className="block w-full p-5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent">
               <div className="flex items-center justify-between">
                 <span className="font-semibold text-card-foreground">Password</span>
                 <div className="flex items-center gap-2">
                   <span className="text-sm text-muted-foreground font-medium">
                     {loadingStatus ? "Loading…" : statusError ? "Unavailable" : (status?.has_password ? "Change password" : "Set password")}
                   </span>
                   <ChevronRight className="w-5 h-5 text-muted-foreground" />
                 </div>
               </div>
             </Link>
          </div>
        </section>

        <section className="security-group">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Connected Accounts
          </h2>
          <div className="security-rows">
             
             {/* Google Row */}
             <div className="flex items-center justify-between p-5">
                <span className="font-semibold text-card-foreground">Google</span>
                {loadingStatus ? <span className="text-sm text-muted-foreground">Loading…</span> : statusError ? <span className="text-sm text-muted-foreground">Unavailable</span> : (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${hasGoogle ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {hasGoogle ? 'Connected' : 'Not connected'}
                  </span>
                )}
             </div>
          </div>
        </section>

        
      </div>
    </div>
  );
}

