"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Wifi, PieChart, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const transactions = [
  {
    group: "Today",
    items: [
      { id: 1, title: "Salary", category: "Income", amount: 3800, type: "income", icon: Briefcase, iconBg: "bg-green-50", iconColor: "text-green-600" },
      { id: 2, title: "Electricity Bill", category: "Obligation", amount: -210, type: "expense", icon: PieChart, iconBg: "bg-red-50", iconColor: "text-red-500" },
      { id: 3, title: "Grocery", category: "Expense", amount: -120, type: "expense", icon: PieChart, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
    ]
  },
  {
    group: "Yesterday",
    items: [
      { id: 4, title: "Freelance Work", category: "Income", amount: 650, type: "income", icon: Download, iconBg: "bg-green-50", iconColor: "text-green-600" },
      { id: 5, title: "Mobile Money Topup", category: "Expense", amount: -50, type: "expense", icon: Wifi, iconBg: "bg-red-50", iconColor: "text-red-500" },
    ]
  }
];

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div className="flex items-center gap-3">
           <Link href="/" className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-700" />
           </Link>
           <h1 className="text-xl md:text-2xl font-bold text-slate-900">Transactions</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
         {[
           { id: "all", label: "All" },
           { id: "income", label: "Income" },
           { id: "expenses", label: "Expenses" }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={cn(
               "flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all",
               activeTab === tab.id 
                 ? "bg-brand text-white shadow-sm" 
                 : "text-slate-500 hover:text-slate-700"
             )}
           >
             {tab.label}
           </button>
         ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-6 mt-6">
         {transactions.map(group => (
            <div key={group.group}>
               <h3 className="text-xs font-bold text-slate-500 mb-3">{group.group}</h3>
               <div className="space-y-1">
                  {group.items
                    .filter(item => {
                       if (activeTab === "all") return true;
                       if (activeTab === "income") return item.type === "income";
                       if (activeTab === "expenses") return item.type === "expense";
                    })
                    .map(item => (
                     <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                           <div className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", item.iconBg, item.iconColor)}>
                              <item.icon className="w-5 h-5" />
                           </div>
                           <div>
                              <div className="font-semibold text-sm text-slate-900">{item.title}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{item.category}</div>
                           </div>
                        </div>
                        <div className={cn(
                           "font-semibold text-sm",
                           item.amount > 0 ? "text-green-600" : "text-slate-700"
                        )}>
                           {item.amount > 0 ? "+" : "-"} GH₵{Math.abs(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                     </div>
                  ))}
                  
                  {group.items.filter(item => activeTab === "all" || item.type === (activeTab === "income" ? "income" : "expense")).length === 0 && (
                     <div className="text-sm text-slate-400 p-4 text-center">No transactions found</div>
                  )}
               </div>
            </div>
         ))}
      </div>

    </div>
  );
}
