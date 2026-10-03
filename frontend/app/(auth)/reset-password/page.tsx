"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!token) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium text-center">
        Invalid or missing reset token. Please request a new password reset link.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords do not match");
      return;
    }
    
    setStatus("loading");
    setErrorMessage("");

    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message?.includes("400") ? "Invalid or expired reset token" : "Failed to reset password. Please try again later.");
    }
  };

  if (status === "success") {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium">
          Your password has been successfully reset.
        </div>
        <Link href="/login" className="inline-flex w-full bg-brand text-white font-semibold rounded-xl py-3.5 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all items-center justify-center gap-2">
          Sign in now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-slate-500 mb-6">Create a new password for your account. Must be at least 8 characters.</p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {status === "error" && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium text-center">
            {errorMessage}
          </div>
        )}
        
        <div>
           <label className="block text-sm font-semibold text-slate-900 mb-1.5" htmlFor="password">New password</label>
           <div className="relative">
              <input 
                id="password"
                type={showPassword ? "text" : "password"} 
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all pr-12"
                disabled={status === "loading"}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
                disabled={status === "loading"}
              >
                 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
           </div>
        </div>
        
        <div>
           <label className="block text-sm font-semibold text-slate-900 mb-1.5" htmlFor="confirm_password">Confirm new password</label>
           <input 
             id="confirm_password"
             type={showPassword ? "text" : "password"} 
             required
             minLength={8}
             value={confirmPassword}
             onChange={(e) => setConfirmPassword(e.target.value)}
             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
             disabled={status === "loading"}
           />
        </div>

        <button 
          type="submit" 
          disabled={status === "loading" || !password || !confirmPassword}
          className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-4 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
           {status === "loading" ? "Resetting..." : "Reset password"} 
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
         <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Set new password</h1>
         <Suspense fallback={<div className="h-20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div></div>}>
           <ResetPasswordForm />
         </Suspense>
      </div>
    </div>
  );
}
