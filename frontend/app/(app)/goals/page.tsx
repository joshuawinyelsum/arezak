"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Laptop, Home, Shield, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

const goals = [
  {
    id: 1,
    title: "Laptop Upgrade",
    current: 1440,
    target: 2000,
    dueDate: "Due in 8 months",
    icon: Laptop,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    status: "active"
  },
  {
    id: 2,
    title: "House Down Payment",
    current: 680,
    target: 5000,
    dueDate: "Due in 2 years",
    icon: Home,
    iconColor: "text-slate-100",
    iconBg: "bg-slate-800",
    status: "active"
  },
  {
    id: 3,
    title: "Emergency Fund",
    current: 520,
    target: 3000,
    dueDate: "Due in 1 year",
    icon: Shield,
    iconColor: "text-slate-100",
    iconBg: "bg-slate-800",
    status: "active"
  },
  {
    id: 4,
    title: "Travel Abroad",
    current: 0,
    target: 4000,
    dueDate: "Not started",
    icon: Plane,
    iconColor: "text-slate-100",
    iconBg: "bg-slate-800",
    status: "active"
  }
];

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div className="flex items-center gap-3">
           <Link href="/" className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-700" />
           </Link>
           <h1 className="text-xl md:text-2xl font-bold text-slate-900">Goals</h1>
        </div>
        <button className="bg-brand text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-brand/90 transition-colors shadow-sm shadow-brand/20">
           Create Goal
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-4">
         {[
           { id: "all", label: "All (4)" },
           { id: "active", label: "Active (3)" },
           { id: "completed", label: "Completed (1)" }
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

      {/* Goal List */}
      <div className="space-y-4">
         {goals.map(goal => {
            const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
            return (
              <div key={goal.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-colors cursor-pointer group flex items-center justify-between">
                 <div className="flex items-center gap-4 flex-1">
                    <div className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0", goal.iconBg, goal.iconColor)}>
                       <goal.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                       <h3 className="font-bold text-slate-900 text-[15px]">{goal.title}</h3>
                       <div className="text-xs text-brand font-medium mt-0.5 mb-1.5">GH₵ {goal.current.toLocaleString()} / {goal.target.toLocaleString()}</div>
                       <div className="text-[11px] text-slate-500">{goal.dueDate}</div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-2 ml-4">
                    <div className="text-xs font-bold text-slate-900">{percentage > 0 ? `${percentage}%` : ""}</div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                       <ArrowLeft className="w-4 h-4 text-slate-400 transform rotate-180" />
                    </div>
                 </div>
              </div>
            );
         })}
      </div>

    </div>
  );
}
