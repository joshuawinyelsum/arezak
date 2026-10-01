"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Smartphone } from "lucide-react"; // Using lucide-react as placeholder for icons

export function SocialAuth() {
  const { socialLogin } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const handleProvider = async (provider: string) => {
    setError("");
    setLoading(provider);
    try {
      // In a real app, this triggers Google/Apple SDK to get a real token.
      // Here we just pass a dummy token, knowing the backend will reject it or return 501 if not configured.
      await socialLogin(provider, "dummy_client_token");
    } catch (err: any) {
      if (err.message?.includes("501")) {
        setError(`${provider} authentication is not configured on this server.`);
      } else {
        setError(`${provider} authentication failed.`);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-center w-full mb-6">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Or continue with</span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium text-center w-full mb-4">
          {error}
        </div>
      )}

      <div className="w-full space-y-3">
        <button
          type="button"
          onClick={() => handleProvider("google")}
          disabled={loading !== null}
          className="w-full bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl py-3 shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Mail className="w-5 h-5 text-blue-500" />
          {loading === "google" ? "Connecting..." : "Continue with Google"}
        </button>
        
        <button
          type="button"
          onClick={() => handleProvider("apple")}
          disabled={loading !== null}
          className="w-full bg-black text-white font-semibold rounded-xl py-3 shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Smartphone className="w-5 h-5" />
          {loading === "apple" ? "Connecting..." : "Continue with Apple"}
        </button>
      </div>
    </div>
  );
}
