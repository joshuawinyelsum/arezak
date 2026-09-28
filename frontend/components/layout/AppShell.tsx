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
  House,
  Target,
  ListChecks,
  ReceiptText,
  Ellipsis,
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
  { name: "Home", href: "/", icon: House },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Rules", href: "/rules", icon: ListChecks },
  { name: "Transactions", href: "/transactions", icon: ReceiptText },
];

// Mobile bottom navigation — exactly five, Home leftmost
const mobileNavItems = [
  { name: "Home", href: "/", icon: House },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Rules", href: "/rules", icon: ListChecks },
  { name: "Transactions", href: "/transactions", icon: ReceiptText },
  { name: "More", href: "/settings", icon: Ellipsis },
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
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-slate-900">
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
        <nav aria-label="Primary navigation" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {desktopNavItems.map((item) => {
            const active = isActiveRoute(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  active
                    ? "bg-brand/8 text-brand font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    active ? "text-brand" : "text-slate-500"
                  )}
                  strokeWidth={1.9}
                  aria-hidden="true"
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

      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 px-8 items-center justify-end border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
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
        </header>

        {/* Page Content */}
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden p-5 pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:px-8 md:py-6 md:pb-8">
          {children}
        </main>

        {/* ── Mobile Bottom Navigation ── */}
        {/* Exactly 5 destinations. Home is leftmost. No action buttons. */}
        <nav aria-label="Primary navigation" className="fixed bottom-0 left-0 right-0 z-50 flex h-[calc(72px+env(safe-area-inset-bottom,0px))] items-center justify-around border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom,0px)] md:hidden">
          {mobileNavItems.map((item) => {
            const active = isActiveRoute(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <item.icon
                  className={cn("h-5 w-5 transition-colors", active ? "text-brand" : "text-slate-500")}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none",
                    active ? "text-brand" : "text-slate-500"
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
