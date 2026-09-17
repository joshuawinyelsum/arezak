"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await register({ name, email, password });
      // Redirect handled automatically by AuthGuard
    } catch (err: any) {
      if (err.message?.includes("400")) {
        // We know duplicate email throws 400 from our API inspection
        setError("A user with this email already exists.");
      } else {
        setError("Failed to create account. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 animate-in fade-in duration-500">
      
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 my-8">
         <div className="flex flex-col items-center text-center mb-8">
            <Image src="/brand/logo.png" alt="Arezak" width={56} height={56} className="mb-6 rounded-xl" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-sm text-slate-500 mt-2">Start managing your money with strict rules.</p>
         </div>

         <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium text-center">
                {error}
              </div>
            )}
            <div>
               <label className="block text-sm font-semibold text-slate-900 mb-1.5" htmlFor="name">Full name</label>
               <input 
                 id="name"
                 type="text" 
                 placeholder="Joshua Winyelsum"
                 required
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                 disabled={isLoading}
               />
            </div>

            <div>
               <label className="block text-sm font-semibold text-slate-900 mb-1.5" htmlFor="email">Email address</label>
               <input 
                 id="email"
                 type="email" 
                 placeholder="name@example.com"
                 required
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                 disabled={isLoading}
               />
            </div>
            
            <div>
               <label className="block text-sm font-semibold text-slate-900 mb-1.5" htmlFor="password">Password</label>
               <div className="relative">
                  <input 
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all pr-12"
                    disabled={isLoading}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    disabled={isLoading}
                  >
                     {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-6 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
               {isLoading ? "Creating account..." : "Create account"} 
               {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
         </form>

         <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account? <Link href="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
         </p>
      </div>
      
    </div>
  );
}

