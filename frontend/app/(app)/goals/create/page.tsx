"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, Shield, Laptop, Plane, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const goalTypes = [
  { id: "general", title: "General Savings", subtitle: "Flexible goal", icon: Wallet, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
  { id: "emergency", title: "Emergency Fund", subtitle: "Safety net", icon: Shield, iconBg: "bg-green-50", iconColor: "text-green-500" },
  { id: "tech", title: "Laptop / Tech", subtitle: "Devices & equipment", icon: Laptop, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
  { id: "travel", title: "Travel", subtitle: "Explore the world", icon: Plane, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
  { id: "home", title: "Home", subtitle: "Big dreams", icon: HomeIcon, iconBg: "bg-red-50", iconColor: "text-red-500" },
];

export default function CreateGoalPage() {
  const [selectedType, setSelectedType] = useState("tech");

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <header className="flex items-center gap-4 py-4 mb-2">
         <Link href="/goals" className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
           <ArrowLeft className="w-5 h-5 text-slate-900" />
         </Link>
         <h1 className="text-xl font-bold text-slate-900">Create Goal</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
         <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-900">Goal Type</h2>
            <p className="text-xs text-slate-500 mt-1">Choose what you&apos;re saving for</p>
         </div>

         <div className="space-y-3">
            {goalTypes.map(type => {
               const isSelected = selectedType === type.id;
               return (
                  <button 
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                       "w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all",
                       isSelected ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                     <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", type.iconBg, type.iconColor)}>
                           <type.icon className="w-6 h-6" />
                        </div>
                        <div>
                           <div className="font-semibold text-sm text-slate-900">{type.title}</div>
                           <div className="text-[11px] text-slate-500 mt-0.5">{type.subtitle}</div>
                        </div>
                     </div>
                     <div className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 mr-1">
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>}
                     </div>
                  </button>
               );
            })}
         </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 md:static md:border-none md:p-0 md:bg-transparent pb-safe">
         <button className="w-full bg-brand text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-brand/20 hover:bg-brand/90 transition-colors">
            Continue
         </button>
      </div>
    </div>
  );
}
