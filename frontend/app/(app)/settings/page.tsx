"use client";

import React, { useState } from "react";
import { Lock, Bell, HelpCircle, Info, ChevronRight, LogOut, User, Palette, WalletCards } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const settingsGroups = [
  {
    title: "Account",
    items: [
      { id: "security", label: "Account & Security", icon: Lock, available: true, href: "/settings/security" },
      { id: "notifications", label: "Notifications", icon: Bell, available: true, href: "/settings/notifications" },
      { id: "appearance", label: "Appearance", icon: Palette, value: "System", available: true, href: "/settings/appearance" },
    ],
  },
  {
    title: "Support",
    items: [
      { id: "support", label: "Help & Support", icon: HelpCircle, available: false },
      { id: "about", label: "About Arezak", icon: Info, available: true, href: "/settings/about" },
    ],
  },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in duration-500 pb-12">
      <header className="py-2">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">More</h1>
      </header>

      <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center shrink-0 overflow-hidden">
          {user?.profile_photo_url ? (
            <img src={user.profile_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-brand">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-base truncate">{name}</h2>
          <p className="text-sm text-slate-400 mt-0.5 truncate">{user?.email ?? ""}</p>
          {user?.handle && <p className="text-sm text-slate-500 mt-0.5 truncate">@{user.handle.replace(/^@/, "")}</p>}
        </div>
        <div className="ml-auto shrink-0">
          <Link href="/settings/profile" className="flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-full transition-colors">
            <User className="w-3.5 h-3.5" /> Edit Profile
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <WalletCards className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">Your Arezak account</h2>
            <p className="mt-1 text-sm text-slate-500">Account number, handle, and receiving QR</p>
          </div>
          <Link href="/receive" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-brand hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            View <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {settingsGroups.map((group) => (
        <div key={group.title}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{group.title}</p>
          <div className="bg-white border border-slate-200 rounded-[20px] shadow-sm overflow-hidden">
            {group.items.map((item, index) => {
              const inner = (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-500">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm text-slate-900">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(item as any).value && <span className="text-xs text-slate-400 font-medium">{(item as any).value}</span>}
                    {item.available ? (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
                    )}
                  </div>
                </>
              );

              const className = `flex items-center justify-between p-4 ${index < group.items.length - 1 ? "border-b border-slate-100" : ""} ${item.available ? "hover:bg-slate-50 cursor-pointer" : "opacity-60"}`;

              if (item.href && item.available) {
                return (
                  <Link key={item.id} href={item.href} className={className}>
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={item.id} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-white border border-red-100 rounded-[20px] shadow-sm overflow-hidden">
        <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-4 p-4 text-left hover:bg-red-50 transition-colors disabled:opacity-60">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <span className="font-semibold text-sm text-red-600">{isLoggingOut ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>

      <p className="text-center text-xs text-slate-300 pb-2">Arezak Beta</p>
    </div>
  );
}
