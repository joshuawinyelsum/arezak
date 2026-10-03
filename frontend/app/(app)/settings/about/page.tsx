"use client";

import React from "react";
import { ChevronLeft, FileText, Shield, LifeBuoy, Code } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">About Arezak</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-8">
        <Image src="/brand/logo.png" alt="Arezak" width={80} height={80} className="rounded-2xl shadow-sm mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Arezak</h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">Version 0.1.0</p>
      </div>

      <div className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden divide-y divide-border">
        <div className="flex items-center justify-between p-5 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><FileText className="w-5 h-5" /></div>
            <span className="font-semibold text-card-foreground">Terms of Service</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-5 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Shield className="w-5 h-5" /></div>
            <span className="font-semibold text-card-foreground">Privacy Policy</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-5 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><LifeBuoy className="w-5 h-5" /></div>
            <span className="font-semibold text-card-foreground">Support</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-5 opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Code className="w-5 h-5" /></div>
            <span className="font-semibold text-card-foreground">Open Source Licenses</span>
          </div>
        </div>
      </div>
    </div>
  );
}
