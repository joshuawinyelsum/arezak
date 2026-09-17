"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Wallet, PieChart, Shield, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const rules = [
  {
    id: 1,
    title: "Paycheck Allocation",
    description: "Every time I receive income",
    status: "active",
    icon: Wallet,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500"
  },
  {
    id: 2,
    title: "50 / 30 / 20 Rule",
    description: "Split income automatically",
    status: "active",
    icon: PieChart,
    iconBg: "bg-slate-800",
    iconColor: "text-slate-100"
  },
  {
    id: 3,
    title: "Emergency Lock",
    description: "Lock until balance ≥ GH₵5,000",
    status: "active",
    icon: Shield,
    iconBg: "bg-slate-800",
    iconColor: "text-slate-100"
  },
  {
    id: 4,
    title: "Goal Lock",
    description: "Lock until target date",
    status: "active",
    icon: Lock,
    iconBg: "bg-slate-800",
    iconColor: "text-slate-100"
  },
  {
    id: 5,
    title: "Bill Protection",
    description: "Protect essential obligations",
    status: "active",
    icon: ShieldCheck,
    iconBg: "bg-slate-800",
    iconColor: "text-slate-100"
  }
];

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState("active");

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div className="flex items-center gap-3">
           <Link href="/" className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-700" />
           </Link>
           <h1 className="text-xl md:text-2xl font-bold text-slate-900">Rules</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand/90 transition-colors shadow-sm shadow-brand/20">
           <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-4">
         {[
           { id: "active", label: "Active (5)" },
           { id: "inactive", label: "Inactive (1)" }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={cn(
               "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
               activeTab === tab.id 
                 ? "bg-brand text-white shadow-sm" 
                 : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
             )}
           >
             {tab.label}
           </button>
         ))}
      </div>

      {/* Rule List */}
      <div className="space-y-4">
         {rules
           .filter(rule => (activeTab === "active" ? rule.status === "active" : rule.status === "inactive"))
           .map(rule => (
            <div key={rule.id} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm hover:border-slate-300 transition-colors cursor-pointer group flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0", rule.iconBg, rule.iconColor)}>
                     <rule.icon className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900 text-[15px]">{rule.title}</h3>
                     <div className="text-[11px] text-slate-500 mt-1">{rule.description}</div>
                  </div>
               </div>
               
               <div className="text-xs font-bold text-green-500 uppercase tracking-wide">
                  {rule.status}
               </div>
            </div>
         ))}
         
         {rules.filter(r => (activeTab === "active" ? r.status === "active" : r.status === "inactive")).length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
               No {activeTab} rules found.
            </div>
         )}
      </div>

    </div>
  );
}
