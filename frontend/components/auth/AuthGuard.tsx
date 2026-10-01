"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "onboarding") {
      router.push("/verify-phone");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4 bg-slate-50">
        <p className="text-slate-600 font-medium">Failed to authenticate. Please check your connection.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-slate-900 font-semibold text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  // Prevent flash while redirecting (for unauthenticated or onboarding)
  return <div className="h-screen w-full bg-slate-50" />;
}
