"use client";

/**
 * AppShell — Layout shell for all authenticated Arezak pages.
 *
 * Navigation decisions (locked):
 *   Desktop sidebar: Home · Goals · Rules · Transactions · [Settings at bottom]
 *   Mobile bottom nav: Home · Goals · Rules · Transactions · More
 *
 * "Home" is always leftmost/topmost.
 * "More" leads to Settings/account management — NOT to money actions.
 * No "Activity", "Insights", or "Accounts" in primary nav.
 * No "+" action button in navigation.
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Home,
  Target,
  SlidersHorizontal,
  Receipt,
  MoreHorizontal,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/contexts/AuthContext";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Desktop sidebar navigation — primary destinations only
const desktopNavItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Rules", href: "/rules", icon: SlidersHorizontal },
  { name: "Transactions", href: "/transactions", icon: Receipt },
];

// Mobile bottom navigation — exactly five, Home leftmost
const mobileNavItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Rules", href: "/rules", icon: SlidersHorizontal },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "More", href: "/settings", icon: MoreHorizontal },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const isActiveRoute = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-slate-100 h-full flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-2.5 border-b border-slate-50">
          <Image
            src="/brand/logo.png"
            alt="Arezak"
            width={30}
            height={30}
            className="rounded-lg object-contain"
          />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            AREZAK
          </span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {desktopNavItems.map((item) => {
            const active = isActiveRoute(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm",
                  active
                    ? "bg-brand/8 text-brand font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px]",
                    active ? "text-brand" : "text-slate-400"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Settings link at bottom of sidebar */}
        <div className="px-3 pb-4 border-t border-slate-50 pt-3">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm",
              isActiveRoute("/settings")
                ? "bg-brand/8 text-brand font-semibold"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Settings
              className={cn(
                "w-[18px] h-[18px]",
                isActiveRoute("/settings") ? "text-brand" : "text-slate-400"
              )}
              strokeWidth={2}
            />
            Settings
          </Link>
        </div>

        {/* Brand tagline */}
        <div className="px-4 pb-6">
          <div className="rounded-2xl bg-gradient-to-br from-[#1A2E7A] to-[#0D173D] p-4 text-white relative overflow-hidden shadow-md">
            <div className="relative z-10">
              <p className="text-xs font-semibold leading-snug text-white/90">
                Discipline today,
                <br />
                Freedom tomorrow.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/30 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 px-8 items-center justify-end border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="relative text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 rounded-xl pr-3 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 text-brand font-bold text-sm">
                  {user?.name?.charAt(0) ?? "U"}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold leading-none text-slate-900">
                    {user?.name ?? "User"}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 leading-none">
                    {user?.email ?? ""}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-slate-400 ml-1 transition-transform",
                    isUserMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex h-14 items-center justify-between px-5 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo.png"
              alt="Arezak"
              width={26}
              height={26}
              className="rounded-md"
            />
            <span className="font-bold text-base tracking-tight">AREZAK</span>
          </div>
          <button
            className="relative text-slate-400 p-2 -mr-1"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:px-8 md:py-6 pb-28 md:pb-8 relative">
          {children}
        </main>

        {/* ── Mobile Bottom Navigation ── */}
        {/* Exactly 5 destinations. Home is leftmost. No action buttons. */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center z-50 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] h-[72px] px-1">
          {mobileNavItems.map((item) => {
            const active = isActiveRoute(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                    active ? "bg-brand/10" : ""
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-all",
                      active ? "text-brand" : "text-slate-400"
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none",
                    active ? "text-brand" : "text-slate-400"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
