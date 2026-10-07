"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SocialAuth } from "@/components/SocialAuth";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Redirecting away once authenticated belongs to the (auth) layout.
  const { register } = useAuth();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);

    try {
      await register({ 
        first_name: firstName, 
        last_name: lastName, 
        email, 
        phone_number: phone.trim() || null,
        handle: handle.trim() || null,
        password 
      });
    } catch (err: any) {
      if (err.message?.includes("400") || err.message?.includes("409")) {
        setError("Email, phone, or handle is already in use.");
      } else {
        setError("Failed to create account. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-card rounded-3xl p-8 shadow-xl shadow-none border border-border my-8">
         <div className="flex flex-col items-center text-center mb-8">
            <Image src="/brand/logo.png" alt="Arezak" width={56} height={56} className="mb-6 rounded-xl" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create your Arezak account</h1>
         </div>

         <form className="space-y-4 mb-8" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-destructive/10 text-destructive-foreground p-3 rounded-xl text-sm font-medium text-center">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-sm font-semibold text-foreground mb-1.5">First name</label>
                 <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={isLoading} />
              </div>
              <div>
                 <label className="block text-sm font-semibold text-foreground mb-1.5">Last name</label>
                 <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={isLoading} />
              </div>
            </div>

            <div>
               <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
               <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={isLoading} />
            </div>
            
            <div>
               <label className="block text-sm font-semibold text-foreground mb-1.5">Phone number <span className="font-normal text-muted-foreground">(optional)</span></label>
               <input type="tel" placeholder="+233..." value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={isLoading} />
            </div>
            
            <div>
               <label className="block text-sm font-semibold text-foreground mb-1.5">@handle <span className="font-normal text-muted-foreground">(optional)</span></label>
               <input type="text" placeholder="username" value={handle} onChange={(e) => setHandle(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={isLoading} />
            </div>
            
            <div>
               <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
               <div className="relative">
                  <input type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand pr-12" disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground" disabled={isLoading}>
                     {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
            </div>
            
            <div>
               <label className="block text-sm font-semibold text-foreground mb-1.5">Confirm password</label>
               <input type={showPassword ? "text" : "password"} required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={isLoading} />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-6 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
               {isLoading ? "Creating account..." : "Create account"} 
            </button>
         </form>

         <SocialAuth />

         <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account? <Link href="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
         </p>
      </div>
    </div>
  );
}





