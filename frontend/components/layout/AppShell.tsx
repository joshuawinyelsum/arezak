"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { House, WalletCards, ArrowLeftRight, ListFilter, UserRound, ChevronDown, LogOut, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const destinations = [
  { name: "Home", href: "/", icon: House },
  { name: "Money", href: "/accounts", icon: WalletCards },
  { name: "Activity", href: "/transactions", icon: ArrowLeftRight },
  { name: "Rules", href: "/rules", icon: ListFilter },
  { name: "You", href: "/settings", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const initials = `${user?.first_name?.[0] ?? "A"}${user?.last_name?.[0] ?? ""}`;

  return (
    <div className="app-shell">
      <aside className="desktop-rail" aria-label="Arezak workspace">
        <Link href="/" className="brand-lockup" aria-label="Arezak home">
          <span className="brand-mark"><Image src="/brand/logo.png" alt="" width={30} height={30} /></span>
          <span><b>AREZAK</b><small>FINANCIAL CONTROL</small></span>
        </Link>
        <div className="rail-caption">WORKSPACE</div>
        <nav className="rail-nav" aria-label="Primary navigation">
          {destinations.map(({ name, href, icon: Icon }) => {
            const active = isActive(href);
            return <Link key={name} href={href} className={`rail-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="rail-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span><span>{name}</span>
            </Link>;
          })}
        </nav>
        <div className="rail-bottom">
          <Link href="/goals" className={`rail-link ${isActive("/goals") ? "is-active" : ""}`} aria-current={isActive("/goals") ? "page" : undefined}><span className="rail-icon"><Target size={18} /></span><span>Goals & planning</span></Link>
          <div className="rail-user">
            <span className="user-avatar">{initials.toUpperCase()}</span>
            <span className="user-meta"><b>{`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Your account"}</b><small>{user?.email ?? ""}</small></span>
            <button className="icon-button rail-menu-trigger" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><ChevronDown size={16} /></button>
            {menuOpen && <div className="account-menu"><Link href="/settings/profile" onClick={() => setMenuOpen(false)}>Profile</Link><button onClick={() => logout()}><LogOut size={15} /> Sign out</button></div>}
          </div>
        </div>
      </aside>
      <section className="app-main">
        <header className="mobile-topbar">
          <Link href="/" className="brand-lockup" aria-label="Arezak home"><span className="brand-mark"><Image src="/brand/logo.png" alt="" width={27} height={27} /></span><span><b>AREZAK</b><small>FINANCIAL CONTROL</small></span></Link>
          <Link className="mobile-avatar" href="/settings" aria-label="Your profile">{initials.toUpperCase()}</Link>
        </header>
        <main className="page-canvas">{children}</main>
        <nav className="mobile-dock" aria-label="Primary navigation">
          {destinations.map(({ name, href, icon: Icon }) => {
            const active = isActive(href);
            return <Link key={name} href={href} className={`dock-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="dock-icon"><Icon size={20} strokeWidth={active ? 2.1 : 1.8} aria-hidden="true" /></span><span>{name}</span>
            </Link>;
          })}
        </nav>
      </section>
    </div>
  );
}
