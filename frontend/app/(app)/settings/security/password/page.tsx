"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PasswordPage() {
  const router = useRouter();
  
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passLoading, setPassLoading] = useState(false);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");
    
    if (newPassword !== confirmPassword) {
      setPassError("New passwords do not match");
      return;
    }
    
    setPassLoading(true);
    try {
      await apiFetch("/identity/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      setPassSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassError(err.message?.includes("400") ? "Incorrect current password" : "Failed to change password");
    } finally {
      setPassLoading(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="w-full max-w-xl mx-auto space-y-6 pb-12 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-accent rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="h-6 w-32 bg-muted rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (statusError || !status) {
    return <div className="w-full max-w-xl mx-auto space-y-5 py-4">
      <button onClick={() => router.back()} className="p-2 hover:bg-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Go back"><ChevronLeft className="w-5 h-5 text-foreground" /></button>
      <div role="alert" className="rounded-xl bg-muted p-5 text-sm"><p>Password settings couldn’t be loaded.</p><button type="button" onClick={() => void fetchStatus()} className="mt-3 font-semibold text-brand underline underline-offset-4">Try again</button></div>
    </div>;
  }

  const isSettingPassword = !status?.has_password;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
           {isSettingPassword ? "Set Password" : "Change Password"}
        </h1>
      </div>

      <form onSubmit={handlePasswordChange} className="bg-card border border-border rounded-[24px] p-6 sm:p-8 shadow-sm space-y-5">
        {passError && <div className="bg-destructive text-destructive-foreground p-4 rounded-xl text-sm font-medium">{passError}</div>}
        {passSuccess && <div className="bg-success text-success-foreground p-4 rounded-xl text-sm font-medium">{passSuccess}</div>}
        
        {!isSettingPassword && (
          <div>
            <label className="block text-sm font-semibold text-card-foreground mb-1.5">Current password</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all text-foreground" disabled={passLoading} />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-1.5">New password</label>
          <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all text-foreground" disabled={passLoading} />
          <p className="text-xs text-muted-foreground mt-2">Must be at least 8 characters long.</p>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-1.5">Confirm new password</label>
          <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-input border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all text-foreground" disabled={passLoading} />
        </div>
        
        <div className="pt-2">
           <button type="submit" disabled={passLoading || !newPassword || !confirmPassword || (!isSettingPassword && !currentPassword)} className="w-full bg-brand text-white font-semibold rounded-xl py-4 hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
             {passLoading ? "Saving..." : (isSettingPassword ? "Set Password" : "Change Password")}
           </button>
        </div>
      </form>
    </div>
  );
}
