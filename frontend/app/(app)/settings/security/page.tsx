"use client";

import React, { useState, useEffect } from "react";
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
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiFetch("/identity/security");
        setStatus(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchStatus();
  }, []);

  const hasGoogle = status?.connected_providers?.includes("google");

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Account & Security</h1>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Key className="w-4 h-4" /> Password & Authentication
          </h2>
          <div className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden">
             
             {/* Password Row */}
             <Link href="/settings/security/password" className="block w-full p-5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent">
               <div className="flex items-center justify-between">
                 <span className="font-semibold text-card-foreground">Password</span>
                 <div className="flex items-center gap-2">
                   <span className="text-sm text-muted-foreground font-medium">
                     {loadingStatus ? "Loading..." : (status?.has_password ? "Change password" : "Set password")}
                   </span>
                   <ChevronRight className="w-5 h-5 text-muted-foreground" />
                 </div>
               </div>
             </Link>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Connected Accounts
          </h2>
          <div className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden">
             
             {/* Google Row */}
             <div className="flex items-center justify-between p-5">
                <span className="font-semibold text-card-foreground">Google</span>
                {loadingStatus ? <span className="text-sm text-muted-foreground">Loading...</span> : (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${hasGoogle ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {hasGoogle ? 'Connected' : 'Not connected'}
                  </span>
                )}
             </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4" /> Devices & Sessions
          </h2>
          <div className="bg-card border border-border rounded-[24px] shadow-sm p-6">
             <p className="text-sm text-muted-foreground mb-6 leading-relaxed">Session management is not yet implemented in Arezak. Active sessions cannot be listed or revoked remotely at this time.</p>
             <button onClick={() => logout()} className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 px-5 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
               <LogOut className="w-4 h-4" /> Sign out of this device
             </button>
          </div>
        </section>
      </div>
    </div>
  );
}
