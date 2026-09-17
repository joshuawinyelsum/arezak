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
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4">
        <p className="text-slate-600">Failed to authenticate. Please check your connection.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-900 text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  // Prevent flash while redirecting
  return null;
}

