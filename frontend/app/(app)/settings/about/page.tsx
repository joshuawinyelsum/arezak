"use client";

import React from "react";
import { ChevronLeft, Info, FileText, Shield, LifeBuoy, Code } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">About Arezak</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-8">
        <Image src="/brand/logo.png" alt="Arezak" width={80} height={80} className="rounded-2xl shadow-sm mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Arezak</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Version 0.1.0</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden divide-y divide-slate-100">
        <div className="flex items-center justify-between p-4 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500"><FileText className="w-4 h-4" /></div>
            <span className="font-medium text-sm text-slate-900">Terms of Service</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500"><Shield className="w-4 h-4" /></div>
            <span className="font-medium text-sm text-slate-900">Privacy Policy</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500"><LifeBuoy className="w-4 h-4" /></div>
            <span className="font-medium text-sm text-slate-900">Support</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500"><Code className="w-4 h-4" /></div>
            <span className="font-medium text-sm text-slate-900">Open Source Licenses</span>
          </div>
        </div>
      </div>
    </div>
  );
}
