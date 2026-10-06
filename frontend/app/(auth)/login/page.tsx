"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SocialAuth } from "@/components/SocialAuth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, status } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email, password });
      // The redirect is handled automatically by the AuthLayout / AuthGuard logic once authenticated
    } catch (err: any) {
      if (err.status === 401) {
        setError("Invalid email or password");
      } else {
        setError("Failed to sign in. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-4 animate-in fade-in duration-500">
      
      <div className="w-full max-w-md bg-card rounded-3xl p-8 shadow-xl shadow-none border border-border">
         <div className="flex flex-col items-center text-center mb-8">
            <Image src="/brand/logo.png" alt="Arezak" width={56} height={56} className="mb-6 rounded-xl" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-2">Money is governed by rules, not decisions.</p>
         </div>

         <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-destructive/10 text-destructive-foreground p-3 rounded-xl text-sm font-medium text-center">
                {error}
              </div>
            )}
            <div>
               <label className="block text-sm font-semibold text-foreground mb-1.5" htmlFor="email">Email address</label>
               <input 
                 id="email"
                 type="email" 
                 placeholder="name@domain.com"
                 required
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                 disabled={isLoading}
               />
            </div>
            
            <div>
               <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-foreground" htmlFor="password">Password</label>
                  <Link href="/forgot-password" className="text-xs text-brand font-medium hover:underline">Forgot?</Link>
               </div>
               <div className="relative">
                  <input 
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all pr-12"
                    disabled={isLoading}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    disabled={isLoading}
                  >
                     {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-4 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
               {isLoading ? "Signing in..." : "Sign in"} 
               {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
         </form>

         
         <SocialAuth />

         <p className="text-center text-sm text-muted-foreground mt-8">

            Don&apos;t have an account? <Link href="/register" className="text-brand font-semibold hover:underline">Sign up</Link>
         </p>
      </div>
      
    </div>
  );
}





