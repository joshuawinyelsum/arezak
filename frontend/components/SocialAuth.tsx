"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI;

const GOOGLE_SDK = "https://accounts.google.com/gsi/client";
const APPLE_SDK =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

/** Load a third-party SDK once, resolving when it is ready. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Provider sign-in timed out")), 8_000);
    const loaded = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    const failed = () => {
      window.clearTimeout(timeout);
      reject(new Error("Provider sign-in could not be loaded"));
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") loaded();
      else {
        existing.addEventListener("load", loaded, { once: true });
        existing.addEventListener("error", failed, { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      loaded();
    });
    script.addEventListener("error", failed);
    document.head.appendChild(script);
  });
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor">
      <path d="M17.05 12.73c.02 2.6 2.28 3.47 2.31 3.48-.02.06-.37 1.25-1.2 2.47-.73 1.06-1.48 2.11-2.67 2.13-1.17.02-1.55-.69-2.88-.69-1.34 0-1.74.67-2.85.71-1.15.04-2.02-1.14-2.75-2.19-1.6-2.32-2.83-6.55-1.18-9.46.82-1.44 2.28-2.35 3.87-2.38 1.13-.02 2.19.76 2.88.76.69 0 1.98-.94 3.34-.8.57.02 2.17.21 3.19 1.56-.08.05-1.87 1.09-1.85 3.27M14.9 4.22c.61-.74 1.02-1.77.91-2.79-.9.04-1.99.6-2.62 1.34-.57.65-1.06 1.7-.93 2.7 1 .08 2.03-.51 2.64-1.25" />
    </svg>
  );
}

function ProviderButton({
  label,
  mark,
  onClick,
  busy,
  unavailable,
}: {
  label: string;
  mark: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  unavailable: boolean;
}) {
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-disabled={unavailable || undefined}
        className={
          "w-full border border-border font-semibold rounded-xl py-3 shadow-sm transition-all flex items-center justify-center gap-3 " +
          (unavailable
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-card text-foreground hover:bg-accent")
        }
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : mark}
        {label}
      </button>
    </div>
  );
}

export function SocialAuth() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const { socialLogin } = useAuth();

  const isGoogleConfigured = !!GOOGLE_CLIENT_ID;
  // Apple's web flow needs both the Services ID and a redirect URI that is
  // registered against it; without either, the flow cannot complete.
  const isAppleConfigured = !!(APPLE_CLIENT_ID && APPLE_REDIRECT_URI);

  const completeSocialLogin = useCallback(
    async (
      provider: "google" | "apple",
      token: string,
      extra: Record<string, unknown> = {},
    ) => {
      setError("");
      setLoading(provider);
      try {
        await socialLogin(provider, token, extra);
        // On success the auth context flips to authenticated and the (auth)
        // layout navigates; leave the spinner up rather than flashing back.
      } catch (err: any) {
        const name = provider === "google" ? "Google" : "Apple";
        setError(
          err?.status === 501
            ? `${name} sign-in is not available in this environment yet.`
            : `${name} sign-in failed. Please try again.`,
        );
        setLoading(null);
      }
    },
    [socialLogin],
  );

  // ---- Google: Identity Services renders its own button and hands back an ID token.
  useEffect(() => {
    if (!isGoogleConfigured) return;
    let cancelled = false;

    loadScript(GOOGLE_SDK)
      .then(() => {
        if (cancelled) return;
        const google = (window as any).google;
        if (!google?.accounts?.id) {
          setGoogleUnavailable(true);
          return;
        }
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res: any) => {
            if (res?.credential) completeSocialLogin("google", res.credential);
          },
        });
        const container = document.getElementById("google-signin-btn");
        if (container) {
          google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            type: "standard",
            width: container.offsetWidth || 300,
          });
          setGoogleReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleUnavailable(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isGoogleConfigured, completeSocialLogin]);

  const handleApple = useCallback(async () => {
    if (!isAppleConfigured) {
      setError(
        "Apple sign-in is not configured in this environment (missing NEXT_PUBLIC_APPLE_CLIENT_ID / NEXT_PUBLIC_APPLE_REDIRECT_URI).",
      );
      return;
    }
    setError("");
    try {
      await loadScript(APPLE_SDK);
      const AppleID = (window as any).AppleID;
      if (!AppleID?.auth) {
        setError("Could not load Apple sign-in. Please try again.");
        return;
      }
      // A fresh nonce per attempt; the backend compares it against the nonce
      // claim in Apple's ID token to bind the token to this request.
      const nonce =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Math.random()).slice(2);

      AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: "name email",
        redirectURI: APPLE_REDIRECT_URI,
        nonce,
        usePopup: true,
      });

      const res = await AppleID.auth.signIn();
      const idToken = res?.authorization?.id_token;
      if (!idToken) {
        setError("Apple sign-in did not return a token. Please try again.");
        return;
      }
      // Apple only sends the name on the very first consent, so pass it through
      // when present and let the backend fall back to its own defaults.
      await completeSocialLogin("apple", idToken, {
        nonce,
        first_name: res?.user?.name?.firstName ?? undefined,
        last_name: res?.user?.name?.lastName ?? undefined,
      });
    } catch (err: any) {
      // Apple reports a user-cancelled popup as an error; that is not a failure.
      if (err?.error === "popup_closed_by_user" || err?.error === "user_cancelled_authorize") return;
      setError("Apple sign-in failed. Please try again.");
    }
  }, [isAppleConfigured, completeSocialLogin]);

  const handleUnconfiguredGoogle = () => {
    setError("Google authentication is not configured in this environment (Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).");
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-center w-full mb-6 mt-6">
        <div className="flex-grow border-t border-border"></div>
        <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Or continue with</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      {error && (
        <div role="alert" className="bg-destructive text-destructive-foreground p-3 rounded-xl text-sm font-medium text-center w-full mb-4">
          {error}
        </div>
      )}

      <div className="w-full space-y-3">
        {isGoogleConfigured ? (
          <div className="relative min-h-11 w-full">
            <div id="google-signin-btn" className={`w-full flex justify-center ${googleReady ? "" : "invisible"}`} />
            {!googleReady && <div className="absolute inset-0">
              <ProviderButton
                label={googleUnavailable ? "Google sign-in unavailable" : "Continue with Google"}
                mark={<GoogleMark />}
                onClick={handleUnconfiguredGoogle}
                busy={false}
                unavailable={!googleReady || googleUnavailable}
              />
            </div>}
          </div>
        ) : (
          <ProviderButton
            label="Continue with Google"
            mark={<GoogleMark />}
            onClick={handleUnconfiguredGoogle}
            busy={false}
            unavailable
          />
        )}

        <ProviderButton
          label="Continue with Apple"
          mark={<AppleMark />}
          onClick={handleApple}
          busy={loading === "apple"}
          unavailable={!isAppleConfigured}
        />
      </div>
    </div>
  );
}
