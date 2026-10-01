"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

export default function VerifyPhonePage() {
  const [phone, setPhone] = useState("");
  const [isPhoneSet, setIsPhoneSet] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // 5 minutes
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const { user, status, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      router.push("/");
    } else if (status === "onboarding" && user?.phone_verified) {
      router.push("/setup-handle");
    }
  }, [status, router]);

  useEffect(() => {
    if (user && user.phone_number && !isPhoneSet) {
      setPhone(user.phone_number);
      setIsPhoneSet(true);
      if (timeLeft === 0) {
         handleResend(user.phone_number);
      }
    }
  }, [user]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    await handleResend(phone);
    setIsPhoneSet(true);
  };

  const handleResend = async (phoneNumber: string = phone) => {
    setResendLoading(true);
    setError("");
    try {
      await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      setTimeLeft(300); // Reset timer
    } catch (err: any) {
      setError("Failed to send code. Make sure the number is valid.");
      setIsPhoneSet(false); // Let them try again
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async () => {
    const code = otp.join("");
    if (code.length !== 6) return;
    
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/verify-phone", {
        method: "POST",
        body: JSON.stringify({ phone_number: phone, otp: code }),
      });
      await refreshUser();
      
      // Check if handle is set. If not, redirect to handle setup
      const res = await apiFetch("/auth/me");
      const userData = await res.json();
      if (!userData.handle) {
        router.push("/setup-handle");
      }
    } catch (err: any) {
      setError("Invalid or expired code.");
      setLoading(false);
    }
  };

  if (status !== "onboarding") return null;

  if (!isPhoneSet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold mb-2 text-center">Enter your phone number</h1>
          <p className="text-slate-500 mb-8 text-center text-sm">We need your phone number to secure your account.</p>
          
          <form onSubmit={handlePhoneSubmit}>
             {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 text-center">{error}</div>}
             <input type="tel" placeholder="+233..." required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={resendLoading} />
             <button type="submit" disabled={resendLoading} className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 shadow-lg hover:bg-brand/90 disabled:opacity-50">
               {resendLoading ? "Sending code..." : "Send Verification Code"}
             </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-2">Verify your phone</h1>
        <p className="text-slate-500 mb-8 text-sm">
          Enter the 6-digit code sent to:<br/>
          <span className="font-semibold text-slate-800">{phone}</span>
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6">{error}</div>}

        <div className="flex justify-center gap-2 mb-8">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          ))}
        </div>

        <button onClick={handleSubmit} disabled={loading || otp.join("").length !== 6} className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mb-6 disabled:opacity-50">
          {loading ? "Verifying..." : "Verify"}
        </button>

        <p className="text-sm text-slate-500">
          {timeLeft > 0 ? (
            <span>Code expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
          ) : (
            <span className="text-red-500">Code expired</span>
          )}
        </p>
        
        <button onClick={() => handleResend(phone)} disabled={resendLoading || timeLeft > 270} className="text-brand font-semibold text-sm mt-4 hover:underline disabled:opacity-50 disabled:no-underline">
          {resendLoading ? "Sending..." : "Resend code"}
        </button>
      </div>
    </div>
  );
}
