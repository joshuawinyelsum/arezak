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
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "unavailable" | "invalid"
  >("idle");
  const { user, status, refreshUser } = useAuth();
  const router = useRouter();

  // Debounced handle availability check with race-condition guard
  useEffect(() => {
    let active = true;

    if (handle.length < 3) {
      setHandleStatus(handle.length === 0 ? "idle" : "invalid");
      return;
    }

    const checkHandle = async () => {
      if (!active) return;
      setHandleStatus("checking");
      try {
        const res = await apiFetch(
          `/identity/handle/available?handle=${encodeURIComponent(handle)}`
        );
        const data = await res.json();
        if (active) {
          setHandleStatus(data.available ? "available" : "unavailable");
        }
      } catch {
        if (active) {
          setHandleStatus("invalid");
        }
      }
    };

    const debounce = setTimeout(checkHandle, 500);
    return () => {
      active = false;
      clearTimeout(debounce);
    };
  }, [handle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      handleStatus === "unavailable" ||
      handleStatus === "invalid" ||
      handleStatus === "checking"
    ) {
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
      if (err instanceof ApiError && err.status === 409) {
        setError("That handle is already taken. Please choose another.");
      } else {
        setError("That handle is already in use or invalid.");
      }
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

  if (
    status === "unauthenticated" ||
    status === "authenticated" ||
    status === "error"
  ) {
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
        <p className="text-slate-500 mb-8 text-sm">
          This is how friends will find you on Arezak.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div role="alert" className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}
          <div className="relative mb-6 text-left">
            <span className="absolute left-4 top-[22px] -translate-y-1/2 text-slate-400 font-semibold">
              @
            </span>
            <input
              type="text"
              placeholder="username"
              required
              minLength={3}
              maxLength={30}
              value={handle}
              onChange={(e) =>
                setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-3 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
              disabled={loading}
              autoFocus
            />
            <div className="absolute right-4 top-[22px] -translate-y-1/2">
              {handleStatus === "checking" && (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              )}
              {handleStatus === "available" && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              {handleStatus === "unavailable" && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            {handleStatus === "checking" && (
              <p className="text-xs text-slate-500 mt-1.5 ml-1">Checking...</p>
            )}
            {handleStatus === "available" && (
              <p className="text-xs text-green-600 mt-1.5 ml-1 font-medium">
                Available
              </p>
            )}
            {handleStatus === "unavailable" && (
              <p className="text-xs text-red-600 mt-1.5 ml-1 font-medium">
                That handle is unavailable
              </p>
            )}
            {handleStatus === "invalid" && (
              <p className="text-xs text-red-600 mt-1.5 ml-1 font-medium">
                Handle must be 3–30 characters: letters, numbers, underscores only
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={
              loading ||
              handleStatus === "unavailable" ||
              handleStatus === "invalid" ||
              handleStatus === "checking" ||
              handle.length < 3
            }
            className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 shadow-lg hover:bg-brand/90 disabled:opacity-50 transition-all"
          >
            {loading ? "Saving..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}

