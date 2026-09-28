"use client";

/**
 * Settings / More page — account and system management.
 *
 * This page is reachable via "More" in mobile nav and "Settings" in desktop sidebar.
 *
 * What belongs here (locked):
 *   Profile / Account · Security · Notifications · Appearance
 *   Help & Support · About · Legal · Sign out
 *
 * What does NOT belong here:
 *   Fund · Send · Pay · Withdraw · Airtime · Data · Bills
 *   Goals · Rules · Recipients · Payment networks
 *
 * Current state: Most sub-pages don't exist yet. Links are shown but marked
 * as unavailable where appropriate. The sign-out function is real and works.
 *
 * Profile data comes from AuthContext — not hardcoded.
 */

import React, { useState } from "react";
import {
  Lock,
  Bell,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  User,
  Palette,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const settingsGroups = [
  {
    title: "Account",
    items: [
      { id: "security", label: "Account & Security", icon: Lock, available: false },
      { id: "notifications", label: "Notifications", icon: Bell, available: false },
      { id: "appearance", label: "Appearance", icon: Palette, value: "System", available: false },
    ],
  },
  {
    title: "Support",
    items: [
      { id: "support", label: "Help & Support", icon: HelpCircle, available: false },
      { id: "about", label: "About Arezak", icon: Info, available: false },
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

  // Initials for avatar
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in duration-500 pb-12">

      {/* Header */}
      <header className="py-2">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">More</h1>
      </header>

      {/* Profile card — uses real auth user, no hardcoded name */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-brand">{initials}</span>
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-base truncate">
            {user?.name ?? "Your Account"}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5 truncate">
            {user?.email ?? ""}
          </p>
          {user?.handle && <p className="text-sm text-slate-500 mt-0.5 truncate">@{user.handle.replace(/^@/, "")}</p>}
        </div>
        {/* Profile editing is a future capability */}
        <div className="ml-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            <User className="w-3 h-3" />
            Edit profile coming soon
          </div>
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
            View
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Settings groups */}
      {settingsGroups.map((group) => (
        <div key={group.title}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            {group.title}
          </p>
          <div className="bg-white border border-slate-200 rounded-[20px] shadow-sm overflow-hidden">
            {group.items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 ${
                  index < group.items.length - 1 ? "border-b border-slate-100" : ""
                } ${item.available ? "cursor-pointer hover:bg-slate-50" : "opacity-60 cursor-default"}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-500">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm text-slate-900">{item.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.value && (
                    <span className="text-xs text-slate-400 font-medium">{item.value}</span>
                  )}
                  {item.available ? (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Soon
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Sign out — this is real and works */}
      <div className="bg-white border border-red-100 rounded-[20px] shadow-sm overflow-hidden">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <span className="font-semibold text-sm text-red-600">
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </span>
        </button>
      </div>

      {/* App version — honest product state */}
      <p className="text-center text-xs text-slate-300 pb-2">
        Arezak · Beta · v0.1
      </p>
    </div>
  );
}
