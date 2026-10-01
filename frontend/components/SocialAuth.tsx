"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function SocialAuth() {
  const { socialLogin } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  // Expose configuration requirements to the user if missing.
  const isGoogleConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isAppleConfigured = !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;

  useEffect(() => {
    // In a full implementation, you would dynamically inject the Google Identity SDK
    // (https://accounts.google.com/gsi/client) and Apple JS (https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js)
    // and initialize them with the client IDs here.
  }, []);

  const handleProvider = async (provider: string) => {
    setError("");
    setLoading(provider);
    
    try {
      if (provider === "google") {
        if (!isGoogleConfigured) {
          setError("Google authentication is not configured in this environment (Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).");
          return;
        }
        // In reality, we would trigger the Google auth flow here and get a real token.
        // For now, since we enforce real tokens but don't have a real environment setup yet,
        // we simulate the Google popup being blocked or failing, rather than sending dummy tokens.
        setError("Google authentication flow failed to initialize.");
        return;
      }
      
      if (provider === "apple") {
        if (!isAppleConfigured) {
          setError("Apple authentication is not configured in this environment (Missing NEXT_PUBLIC_APPLE_CLIENT_ID).");
          return;
        }
        setError("Apple authentication flow failed to initialize.");
        return;
      }
    } catch (err: any) {
      setError(`${provider} authentication failed.`);
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
          {/* Proper Google "G" logo */}
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading === "google" ? "Connecting..." : "Continue with Google"}
        </button>
        
        <button
          type="button"
          onClick={() => handleProvider("apple")}
          disabled={loading !== null}
          className="w-full bg-black text-white font-semibold rounded-xl py-3 shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {/* Proper Apple logo */}
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="white">
            <path d="M17.05 13.56c-.02-2.14 1.74-3.19 1.82-3.23-1-1.46-2.55-1.67-3.11-1.69-1.33-.14-2.59.78-3.27.78-.68 0-1.72-.75-2.82-.73-1.42.02-2.73.83-3.46 2.1-1.48 2.57-.38 6.38 1.07 8.47.7 1.01 1.53 2.14 2.65 2.1 1.07-.04 1.48-.69 2.78-.69 1.3 0 1.68.69 2.79.67 1.14-.02 1.85-1.02 2.54-2.03.8-1.16 1.13-2.28 1.15-2.34-.02-.01-2.12-.81-2.14-3.41zM14.67 6.46c.59-.72 1-1.72.89-2.71-.85.03-1.89.57-2.49 1.29-.53.64-.98 1.66-.86 2.64.95.07 1.88-.49 2.46-1.22z"/>
          </svg>
          {loading === "apple" ? "Connecting..." : "Continue with Apple"}
        </button>
      </div>
    </div>
  );
}
