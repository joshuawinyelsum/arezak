"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      <header className="flex items-center gap-3 py-2 mb-2">
         <Link href="/" className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 transition-colors">
           <ArrowLeft className="w-5 h-5 text-slate-700" />
         </Link>
         <h1 className="text-xl md:text-2xl font-bold text-slate-900">Insights</h1>
      </header>

      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
         <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-4">
            <BarChart2 className="w-8 h-8" />
         </div>
         <h2 className="text-xl font-bold text-slate-900 mb-2">Insights Coming Soon</h2>
         <p className="text-sm text-slate-500 max-w-sm mx-auto">
            We&apos;re building powerful analytics to help you understand your spending patterns and goal velocity. Check back later.
         </p>
      </div>
    </div>
  );
}
