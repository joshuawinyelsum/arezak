import React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Lock, Bell, Palette, DollarSign, HelpCircle, Info } from "lucide-react";

const settingsItems = [
  { id: "security", label: "Account & Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette, value: "Light" },
  { id: "currency", label: "Currency", icon: DollarSign, value: "Ghana Cedi (GHS)" },
  { id: "support", label: "Help & Support", icon: HelpCircle },
  { id: "about", label: "About Arezak", icon: Info },
];

export default function SettingsPage() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="flex items-center gap-3 py-2 mb-2">
         <Link href="/" className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 transition-colors">
           <ArrowLeft className="w-5 h-5 text-slate-700" />
         </Link>
         <h1 className="text-xl md:text-2xl font-bold text-slate-900">Settings</h1>
      </header>

      {/* Profile Card */}
      <Link href="/settings/profile" className="flex items-center justify-between bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm hover:border-slate-300 transition-colors group">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden shrink-0">
               <img src="https://i.pravatar.cc/150?u=joshua" alt="Joshua" className="w-full h-full object-cover" />
            </div>
            <div>
               <h2 className="font-bold text-slate-900 text-base">Joshua Winyelsum</h2>
               <p className="text-sm text-slate-500 mt-0.5">Student</p>
            </div>
         </div>
         <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
      </Link>

      {/* Settings List */}
      <div className="bg-white border border-slate-200 rounded-[20px] shadow-sm overflow-hidden">
         {settingsItems.map((item, index) => (
            <Link 
               key={item.id} 
               href={`/settings/${item.id}`}
               className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group border-b border-slate-100 last:border-0"
            >
               <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-600 group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                     <item.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm text-slate-900">{item.label}</span>
               </div>
               
               <div className="flex items-center gap-2">
                  {item.value && (
                     <span className="text-xs text-slate-500 font-medium">{item.value}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
               </div>
            </Link>
         ))}
      </div>

    </div>
  );
}
