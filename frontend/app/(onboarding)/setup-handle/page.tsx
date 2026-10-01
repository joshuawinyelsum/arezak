"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

export default function SetupHandlePage() {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, status, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle || handle.length < 3) return;
    
    setLoading(true);
    setError("");
    try {
      await apiFetch("/identity/handle", {
        method: "PATCH",
        body: JSON.stringify({ handle }),
      });
      await refreshUser();
      router.push("/");
    } catch (err: any) {
      setError("That handle is already in use or invalid.");
      setLoading(false);
    }
  };

  if (status !== "onboarding") return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-2">Claim your handle</h1>
        <p className="text-slate-500 mb-8 text-sm">This is how friends will find you on Arezak.</p>

        <form onSubmit={handleSubmit}>
           {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6">{error}</div>}
           <div className="relative mb-6">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">@</span>
             <input type="text" placeholder="username" required minLength={3} value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={loading} />
           </div>
           <button type="submit" disabled={loading || handle.length < 3} className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 shadow-lg hover:bg-brand/90 disabled:opacity-50">
             {loading ? "Saving..." : "Complete Setup"}
           </button>
        </form>
      </div>
    </div>
  );
}
