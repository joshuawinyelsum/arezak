"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState({
    transactions: true,
    security: true,
    goals: true,
    rules: false,
    product: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("arezak_notifications");
    if (saved) setPrefs(JSON.parse(saved));
  }, []);

  const togglePref = (key: keyof typeof prefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    localStorage.setItem("arezak_notifications", JSON.stringify(newPrefs));
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden divide-y divide-slate-100">
        {[
          { id: "transactions", label: "Transactions", desc: "Alerts for money in and out." },
          { id: "security", label: "Security Alerts", desc: "New logins, password changes." },
          { id: "goals", label: "Goals", desc: "Progress updates on your financial goals." },
          { id: "rules", label: "Rules", desc: "When automatic transfers occur." },
          { id: "product", label: "Product & Features", desc: "New features from Arezak." },
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="font-medium text-sm text-slate-900">{item.label}</span>
              <span className="text-xs text-slate-500 mt-0.5">{item.desc}</span>
            </div>
            <button
              onClick={() => togglePref(item.id as keyof typeof prefs)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[item.id as keyof typeof prefs] ? 'bg-brand' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs[item.id as keyof typeof prefs] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-center text-slate-400 mt-6 px-4">
        These preferences are saved locally on this device. Account-level synchronization and push delivery are not yet implemented.
      </p>
    </div>
  );
}
