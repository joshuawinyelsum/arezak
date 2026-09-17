"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 animate-in fade-in duration-500">
      
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
         <div className="flex flex-col items-center text-center mb-8">
            <Image src="/brand/logo.png" alt="Arezak" width={56} height={56} className="mb-6 rounded-xl" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-2">Money is governed by rules, not decisions.</p>
         </div>

         <form className="space-y-4">
            <div>
               <label className="block text-sm font-semibold text-slate-900 mb-1.5">Email address</label>
               <input 
                 type="email" 
                 placeholder="name@example.com"
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
               />
            </div>
            
            <div>
               <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-900">Password</label>
                  <Link href="#" className="text-xs text-brand font-medium hover:underline">Forgot?</Link>
               </div>
               <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all pr-12"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                     {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
            </div>

            <button type="button" className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 mt-4 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-2">
               Sign in <ArrowRight className="w-4 h-4" />
            </button>
         </form>

         <p className="text-center text-sm text-slate-500 mt-8">
            Don&apos;t have an account? <Link href="/register" className="text-brand font-semibold hover:underline">Create one</Link>
         </p>
      </div>
      
    </div>
  );
}
