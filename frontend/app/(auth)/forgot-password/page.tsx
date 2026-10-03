"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";

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
      setErrorMessage("Failed to request password reset. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
         <div className="mb-6">
            <Link href="/login" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
               <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
            </Link>
         </div>

         <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Reset password</h1>
         
         {status === "success" ? (
           <div className="space-y-4">
             <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium">
               If an account exists with that email, a password reset link has been sent. Check your inbox.
             </div>
             <p className="text-sm text-slate-500">
               (Note: For this beta environment, you may need to check the backend server logs for the link if email delivery is not configured).
             </p>
           </div>
         ) : (
           <>
             <p className="text-sm text-slate-500 mb-6">Enter your email address and we&apos;ll send you a link to reset your password.</p>
             <form className="space-y-4" onSubmit={handleSubmit}>
                {status === "error" && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium text-center">
                    {errorMessage}
                  </div>
                )}
                <div>
                   <label className="block text-sm font-semibold text-slate-900 mb-1.5" htmlFor="email">Email address</label>
                   <input 
                     id="email"
                     type="email" 
                     placeholder="name@domain.com"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                     disabled={status === "loading"}
                   />
                </div>

                <button 
                  type="submit" 
                  disabled={status === "loading" || !email}
                  className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-4 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                   {status === "loading" ? "Sending..." : "Send reset link"} 
                </button>
             </form>
           </>
         )}
      </div>
    </div>
  );
}
