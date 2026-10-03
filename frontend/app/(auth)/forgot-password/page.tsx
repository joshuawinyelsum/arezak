"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      await apiFetch("/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      if (err instanceof ApiError && err.status === 501) {
        setErrorMessage("Email delivery service is not configured. Password reset is temporarily unavailable.");
      } else {
        setErrorMessage("Failed to request password reset. Please try again later.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-card rounded-[32px] p-8 shadow-xl shadow-slate-200/50  border border-border">
         <div className="mb-6">
            <Link href="/login" className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
               <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
            </Link>
         </div>

         <h1 className="text-2xl font-bold text-card-foreground tracking-tight mb-2">Reset password</h1>
         
         {status === "success" ? (
           <div className="space-y-4">
             <div className="bg-success text-success-foreground p-4 rounded-xl text-sm font-medium">
               If an account exists with that email, a password reset link has been sent. Check your inbox.
             </div>
           </div>
         ) : (
           <>
             <p className="text-sm text-muted-foreground mb-6">Enter your email address and we&apos;ll send you a link to reset your password.</p>
             <form className="space-y-4" onSubmit={handleSubmit}>
                {status === "error" && (
                  <div className="bg-destructive text-destructive-foreground p-4 rounded-xl text-sm font-medium text-center">
                    {errorMessage}
                  </div>
                )}
                <div>
                   <label className="block text-sm font-semibold text-card-foreground mb-1.5" htmlFor="email">Email address</label>
                   <input 
                     id="email"
                     type="email" 
                     placeholder="name@domain.com"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full bg-input border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all text-foreground"
                     disabled={status === "loading"}
                   />
                </div>

                <div className="pt-2">
                   <button 
                     type="submit" 
                     disabled={status === "loading" || !email}
                     className="w-full bg-brand text-white font-semibold rounded-xl py-4 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                   >
                      {status === "loading" ? "Sending..." : "Send reset link"} 
                   </button>
                </div>
             </form>
           </>
         )}
      </div>
    </div>
  );
}
