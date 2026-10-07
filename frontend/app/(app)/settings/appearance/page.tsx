"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, Monitor, Moon, Sun, Check } from "lucide-react";
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
    <div className="page-frame appearance-page pb-12">
      <header className="page-heading"><div><p className="page-eyebrow">YOUR SPACE / PREFERENCES</p><h1>Appearance</h1><p>Choose how Arezak looks on this device.</p></div><button onClick={() => router.back()} aria-label="Back" className="balance-toggle"><ChevronLeft className="w-5 h-5" /></button></header>
      <section aria-label="Color theme" className="theme-options">
        {([
          { id: "light" as const, label: "Light", note: "Clear surfaces", Icon: Sun },
          { id: "dark" as const, label: "Dark", note: "Deep Arezak blue", Icon: Moon },
          { id: "system" as const, label: "System", note: "Follow your device", Icon: Monitor },
        ]).map(({ id, label, note, Icon }) => <button key={id} type="button" aria-pressed={theme === id} onClick={() => handleThemeChange(id)} className={`theme-option ${theme === id ? "is-selected" : ""}`}>
          <span className={`theme-preview theme-preview-${id}`}><span /><i /></span>
          <span className="theme-option-copy"><b><Icon size={15} aria-hidden="true" />{label}</b><small>{note}</small></span>
          <span className="theme-check" aria-hidden="true">{theme === id && <Check size={14} />}</span>
        </button>)}
      </section>
      <p className="theme-note">Your selection is saved on this device. System mode follows your device’s light or dark appearance.</p>
    </div>
  );
}
