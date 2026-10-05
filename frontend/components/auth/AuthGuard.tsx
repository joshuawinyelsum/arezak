"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, status, refreshUser } = useAuth();
  const router = useRouter();

  // If the backend returns onboarding but there's no actual onboarding task left,
  // we must consider the user authenticated to prevent an infinite spinner loop.
  const isFullyOnboarded = status === "onboarding" && user?.handle;
  const effectiveStatus = isFullyOnboarded ? "authenticated" : status;

  useEffect(() => {
    if (effectiveStatus === "unauthenticated") {
      router.push("/login");
    } else if (effectiveStatus === "onboarding") {
      if (!user?.handle) {
        router.push("/setup-handle");
      }
    }
  }, [effectiveStatus, router, user?.handle]);

  if (effectiveStatus === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (effectiveStatus === "error") {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4 bg-muted">
        <p className="text-muted-foreground font-medium">We couldn&apos;t load your session.</p>
        <button 
          onClick={() => refreshUser()}
          className="px-6 py-2.5 bg-primary font-semibold text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (effectiveStatus === "authenticated") {
    return <>{children}</>;
  }

  // Prevent flash while redirecting (for unauthenticated or onboarding)
  return (
      <div className="flex h-screen w-full items-center justify-center bg-muted">
        <div className="w-8 h-8 animate-spin text-brand border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
}
