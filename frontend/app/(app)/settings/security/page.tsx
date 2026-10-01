"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ChevronLeft, Key, Smartphone, Mail, Shield, MonitorSmartphone, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SecurityPage() {
  const { logout } = useAuth();
  const router = useRouter();
  
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passLoading, setPassLoading] = useState(false);

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

  const hasGoogle = status?.connected_providers?.includes("google");
  const hasApple = status?.connected_providers?.includes("apple");

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Account & Security</h1>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3 px-1 flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-400" /> Password
          </h2>
          <form onSubmit={handlePasswordChange} className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-4">
            {passError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{passError}</div>}
            {passSuccess && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-medium">{passSuccess}</div>}
            
            {status?.has_password && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Current password</label>
                <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={passLoading} />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">New password</label>
              <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={passLoading} />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Confirm new password</label>
              <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={passLoading} />
            </div>
            
            <button type="submit" disabled={passLoading || !newPassword} className="w-full bg-slate-900 text-white font-semibold rounded-xl py-3 mt-2 hover:bg-slate-800 disabled:opacity-50">
              {passLoading ? "Updating..." : (status?.has_password ? "Update password" : "Set password")}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3 px-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" /> Connected Accounts
          </h2>
          <div className="bg-white border border-slate-200 rounded-[20px] shadow-sm overflow-hidden divide-y divide-slate-100">
             <div className="flex items-center justify-between p-4">
                <span className="font-medium text-sm text-slate-900">Google</span>
                {loadingStatus ? <span className="text-sm text-slate-400">Loading...</span> : (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${hasGoogle ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {hasGoogle ? 'Connected' : 'Not connected'}
                  </span>
                )}
             </div>
             <div className="flex items-center justify-between p-4">
                <span className="font-medium text-sm text-slate-900">Apple</span>
                {loadingStatus ? <span className="text-sm text-slate-400">Loading...</span> : (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${hasApple ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {hasApple ? 'Connected' : 'Not connected'}
                  </span>
                )}
             </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3 px-1 flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-slate-400" /> Devices & Sessions
          </h2>
          <div className="bg-white border border-slate-200 rounded-[20px] shadow-sm p-4">
             <p className="text-sm text-slate-500 mb-4">You are currently signed in on this device. Backend multi-session revocation is not yet available.</p>
             <button onClick={() => logout()} className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-colors">
               <LogOut className="w-4 h-4" /> Sign out of this device
             </button>
          </div>
        </section>
      </div>
    </div>
  );
}
