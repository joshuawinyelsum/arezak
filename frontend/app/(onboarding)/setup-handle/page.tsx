"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SetupHandlePage() {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");
  const { user, status, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      router.push("/");
    } else if (status === "onboarding" && !user?.phone_verified) {
      router.push("/verify-phone");
    }
  }, [status, router]);

  useEffect(() => {
    if (!handle) {
      setHandleStatus("idle");
      return;
    }
    
    if (handle.length < 3) {
      setHandleStatus("invalid");
      return;
    }

    setHandleStatus("checking");
    
    const timeoutId = setTimeout(async () => {
      try {
        const res = await apiFetch("/identity/resolve", {
          method: "POST",
          body: JSON.stringify({ identifier: `@${handle.toLowerCase()}` })
        });
        await res.json();
        setHandleStatus("unavailable");
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 404) {
          setHandleStatus("available");
        } else {
          setHandleStatus("idle");
        }
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [handle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (handleStatus === "unavailable" || handleStatus === "invalid" || handleStatus === "checking") {
      setError("Please choose a valid and available handle.");
      return;
    }
    
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


  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="w-8 h-8 animate-spin text-brand border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === "unauthenticated" || status === "authenticated" || status === "error") {
    // The layout will handle the redirect, just render a safe blank state while redirecting
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="w-8 h-8 animate-spin text-brand border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-2">Claim your handle</h1>
        <p className="text-slate-500 mb-8 text-sm">This is how friends will find you on Arezak.</p>

        <form onSubmit={handleSubmit}>
           {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6">{error}</div>}
           <div className="relative mb-6 text-left">
             <span className="absolute left-4 top-[22px] -translate-y-1/2 text-slate-400 font-semibold">@</span>
             <input type="text" placeholder="username" required minLength={3} value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-3 focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={loading} />
             <div className="absolute right-4 top-[22px] -translate-y-1/2">
                {handleStatus === "checking" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                {handleStatus === "available" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {handleStatus === "unavailable" && <AlertCircle className="w-4 h-4 text-red-500" />}
             </div>
             {handleStatus === "checking" && <p className="text-xs text-slate-500 mt-1.5 ml-1">Checking...</p>}
             {handleStatus === "available" && <p className="text-xs text-green-600 mt-1.5 ml-1 font-medium">Available</p>}
             {handleStatus === "unavailable" && <p className="text-xs text-red-600 mt-1.5 ml-1 font-medium">That handle is unavailable</p>}
             {handleStatus === "invalid" && <p className="text-xs text-red-600 mt-1.5 ml-1 font-medium">Invalid handle</p>}
           </div>
           <button type="submit" disabled={loading || handleStatus === "unavailable" || handleStatus === "invalid" || handleStatus === "checking"} className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 shadow-lg hover:bg-brand/90 disabled:opacity-50">
             {loading ? "Saving..." : "Complete Setup"}
           </button>
        </form>
      </div>
    </div>
  );
}
