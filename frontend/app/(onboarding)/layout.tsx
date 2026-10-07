"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { status, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }
  
  if (status === "error") {
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

  return (
      <div className="flex h-screen w-full items-center justify-center bg-muted">
        <div className="w-8 h-8 animate-spin text-brand border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
}
