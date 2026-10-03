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
        <button onClick={() => router.back()} className="p-2 hover:bg-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
      </div>

      <div className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden divide-y divide-border">
        {[
          { id: "transactions", label: "Transactions", desc: "Alerts for money in and out." },
          { id: "security", label: "Security Alerts", desc: "New logins, password changes." },
          { id: "goals", label: "Goals", desc: "Progress updates on your financial goals." },
          { id: "rules", label: "Rules", desc: "When automatic transfers occur." },
          { id: "product", label: "Product & Features", desc: "New features from Arezak." },
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between p-5">
            <div className="flex flex-col pr-4">
              <span className="font-semibold text-card-foreground">{item.label}</span>
              <span className="text-sm text-muted-foreground mt-0.5">{item.desc}</span>
            </div>
            <button
              onClick={() => togglePref(item.id as keyof typeof prefs)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${prefs[item.id as keyof typeof prefs] ? 'bg-brand' : 'bg-border'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${prefs[item.id as keyof typeof prefs] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-sm text-center text-muted-foreground mt-6 px-4">
        These preferences are saved locally on this device. Account-level synchronization and push delivery are not yet implemented.
      </p>
    </div>
  );
}
