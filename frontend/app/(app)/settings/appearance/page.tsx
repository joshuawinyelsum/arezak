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
    
    if (newTheme === "dark" || (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Appearance</h1>
      </div>

      <div className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden divide-y divide-border">
        <button onClick={() => handleThemeChange("light")} className="w-full flex items-center justify-between p-5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500"><Sun className="w-5 h-5" /></div>
            <span className="font-semibold text-card-foreground">Light</span>
          </div>
          {theme === "light" && <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>}
        </button>
        
        <button onClick={() => handleThemeChange("dark")} className="w-full flex items-center justify-between p-5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Moon className="w-5 h-5" /></div>
            <span className="font-semibold text-card-foreground">Dark</span>
          </div>
          {theme === "dark" && <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>}
        </button>
        
        <button onClick={() => handleThemeChange("system")} className="w-full flex items-center justify-between p-5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Monitor className="w-5 h-5" /></div>
            <span className="font-semibold text-card-foreground">System</span>
          </div>
          {theme === "system" && <div className="w-2.5 h-2.5 rounded-full bg-brand"></div>}
        </button>
      </div>
    </div>
  );
}
