"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

type Theme = "light" | "dark" | "system";

export default function AppearancePage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("arezak_theme") as Theme;
    if (saved) setTheme(saved);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("arezak_theme", newTheme);
    
    // In a real app, this would trigger a context or Tailwind dark mode class change on document.documentElement
    if (newTheme === "dark" || (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Appearance</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden divide-y divide-slate-100">
        <button onClick={() => handleThemeChange("light")} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-500"><Sun className="w-4 h-4" /></div>
            <span className="font-medium text-sm text-slate-900">Light</span>
          </div>
          {theme === "light" && <div className="w-2 h-2 rounded-full bg-brand"></div>}
        </button>
        
        <button onClick={() => handleThemeChange("dark")} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500"><Moon className="w-4 h-4" /></div>
            <span className="font-medium text-sm text-slate-900">Dark</span>
          </div>
          {theme === "dark" && <div className="w-2 h-2 rounded-full bg-brand"></div>}
        </button>
        
        <button onClick={() => handleThemeChange("system")} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><Monitor className="w-4 h-4" /></div>
            <span className="font-medium text-sm text-slate-900">System</span>
          </div>
          {theme === "system" && <div className="w-2 h-2 rounded-full bg-brand"></div>}
        </button>
      </div>
    </div>
  );
}
