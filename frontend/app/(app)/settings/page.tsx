"use client";

import React, { useState } from "react";
import { Lock, Bell, HelpCircle, Info, ChevronRight, LogOut, User, Palette, WalletCards } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";

const settingsGroups = [
  {
    title: "Account",
    items: [
      { id: "security", label: "Account & Security", icon: Lock, available: true, href: "/settings/security" },
      { id: "notifications", label: "Notifications", icon: Bell, available: false },
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
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="py-2 px-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">More</h1>
      </header>

      {/* Edit Profile Row */}
      <Link href="/settings/profile" className="block bg-card border border-border rounded-[24px] p-5 shadow-sm hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center shrink-0 overflow-hidden relative">
            {user?.profile_photo_url ? (
              <Image src={user.profile_photo_url} alt="Profile" fill className="object-cover" unoptimized />
            ) : (
              <span className="text-xl font-bold text-brand">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-card-foreground text-base truncate">{name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{user?.email ?? ""}</p>
            {user?.handle && <p className="text-sm text-muted-foreground mt-0.5 truncate">@{user.handle.replace(/^@/, "")}</p>}
          </div>
          <div className="ml-auto shrink-0 flex items-center">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </Link>

      {/* Arezak Account Row */}
      <Link href="/receive" className="block rounded-[24px] border border-border bg-card p-5 shadow-sm hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <WalletCards className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-card-foreground text-base">Your Arezak account</h2>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">Account number, handle, and receiving QR</p>
          </div>
          <div className="ml-auto shrink-0 flex items-center">
             <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </Link>

      {/* Settings Groups */}
      {settingsGroups.map((group) => (
        <div key={group.title}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">{group.title}</p>
          <div className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden">
            {group.items.map((item, index) => {
              const inner = (
                <div className="flex items-center w-full justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-card-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(item as any).value && <span className="text-sm text-muted-foreground font-medium">{(item as any).value}</span>}
                    {item.available ? (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
                    )}
                  </div>
                </div>
              );

              const className = `block w-full p-4 ${index < group.items.length - 1 ? "border-b border-border" : ""} ${item.available ? "hover:bg-accent cursor-pointer focus-visible:outline-none focus-visible:bg-accent transition-colors" : "opacity-60"}`;

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

      {/* Logout Row */}
      <div className="bg-card border border-red-500/20 rounded-[24px] shadow-sm overflow-hidden mt-8">
        <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center justify-between p-4 text-left hover:bg-destructive transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:bg-destructive">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-destructive-foreground" />
            </div>
            <span className="font-bold text-destructive-foreground">{isLoggingOut ? "Signing out..." : "Sign out"}</span>
          </div>
        </button>
      </div>

      <p className="text-center text-sm font-medium text-muted-foreground/50 pb-2 mt-6 tracking-wide">AREZAK BETA</p>
    </div>
  );
}
