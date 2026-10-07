"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  // Authenticated visitors belong in the app, not on the sign-in screens.
  // `replace` keeps the auth screen out of history so Back does not bounce
  // the user between /login and / once a session exists.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // These screens are public: nothing here depends on knowing the session, so
  // they render immediately instead of waiting on /auth/me. Holding them behind
  // the session probe cost a full-screen blank for the length of that request.
  if (status === "authenticated") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <div className="auth-experience">{children}</div>;
}
