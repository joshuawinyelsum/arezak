"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { House, ArrowLeftRight, MoreHorizontal, ChevronDown, LogOut, Target, UserRound, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MoneyActionMenu } from "@/components/layout/MoneyActionMenu";

const destinations = [
  { name: "Home", href: "/", icon: House, glyph: "home" },
  { name: "Goals", href: "/goals", icon: Target, glyph: "goals" },
  { name: "Activity", href: "/transactions", icon: ArrowLeftRight, glyph: "activity" },
  { name: "More", href: "/more", icon: MoreHorizontal, glyph: "more" },
];

function ActiveGlyph({ kind }: { kind: string }) {
  if (kind === "home") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8 2.3 10.6h2.3v10.1h6.1v-6h2.6v6h6.1V10.6h2.3L12 2.8Z"/><path fill="var(--surface)" d="M10.2 14.7h3.6v6h-3.6z"/></svg>;
  if (kind === "goals") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="currentColor"/><circle cx="12" cy="12" r="6.2" fill="var(--surface)"/><circle cx="12" cy="12" r="3.1" fill="currentColor"/></svg>;
  if (kind === "activity") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6.7h12.9l-2.5-2.5 1.5-1.5L21 7.8l-5.1 5.1-1.5-1.5 2.5-2.5H4zM20 17.3H7.1l2.5 2.5-1.5 1.5L3 16.2l5.1-5.1 1.5 1.5-2.5 2.5H20z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  useEffect(() => {
    const openActions = () => setActionsOpen(true);
    window.addEventListener("arezak:open-money-actions", openActions);
    return () => window.removeEventListener("arezak:open-money-actions", openActions);
  }, []);
  const isActive = (href: string) => href === "/"
    ? pathname === "/"
    : href === "/more"
      ? pathname === "/more" || pathname === "/accounts" || pathname === "/rules" || pathname.startsWith("/settings") || pathname === "/receive"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className={`app-shell ${pathname === "/" ? "is-home" : ""}`} id="app-shell">
      <aside className="desktop-rail" aria-label="Arezak workspace">
        <Link href="/" className="brand-lockup" aria-label="Arezak home">
          <span className="brand-mark"><Image src="/brand/arezak-reference-mark.png" alt="" width={30} height={30} /></span>
          <span><b>AREZAK</b><small>FINANCIAL CONTROL</small></span>
        </Link>
        <div className="rail-caption">WORKSPACE</div>
        <nav className="rail-nav" aria-label="Primary navigation">
          {destinations.slice(0, 2).map(({ name, href, icon: Icon, glyph }) => {
            const active = isActive(href);
            return <Link key={name} href={href} className={`rail-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="rail-icon">{active ? <ActiveGlyph kind={glyph} /> : <Icon size={19} strokeWidth={1.8} aria-hidden="true" />}</span><span>{name}</span>
            </Link>;
          })}
          <button type="button" className="rail-action" onClick={() => setActionsOpen(true)} aria-label="Money actions" aria-haspopup="dialog" aria-expanded={actionsOpen}><span className="rail-action-icon"><Plus size={19} aria-hidden="true" /></span><span>Actions</span></button>
          {destinations.slice(2).map(({ name, href, icon: Icon, glyph }) => {
            const active = isActive(href);
            return <Link key={name} href={href} className={`rail-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="rail-icon">{active ? <ActiveGlyph kind={glyph} /> : <Icon size={19} strokeWidth={1.8} aria-hidden="true" />}</span><span>{name}</span>
            </Link>;
          })}
        </nav>
        <div className="rail-bottom">
          <div className="rail-user">
            <span className="user-avatar">{user?.profile_photo_url ? <Image src={user.profile_photo_url} alt="" fill sizes="40px" className="object-cover" unoptimized /> : <UserRound size={18} aria-hidden="true" />}</span>
            <span className="user-meta"><b>{`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Your account"}</b><small>{user?.email ?? ""}</small></span>
            <button className="icon-button rail-menu-trigger" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><ChevronDown size={16} /></button>
            {menuOpen && <div className="account-menu"><Link href="/settings/profile" onClick={() => setMenuOpen(false)}>Profile</Link><button onClick={() => logout()}><LogOut size={15} /> Sign out</button></div>}
          </div>
        </div>
      </aside>
      <section className="app-main">
        {pathname !== "/" && (
          <header className="mobile-topbar">
            <Link href="/" className="brand-lockup" aria-label="Arezak home"><span className="brand-mark"><Image src="/brand/arezak-reference-mark.png" alt="" width={27} height={27} /></span><span><b>AREZAK</b><small>FINANCIAL CONTROL</small></span></Link>
            <Link className="mobile-avatar" href="/settings/profile" aria-label="Profile">{user?.profile_photo_url ? <Image src={user.profile_photo_url} alt="" fill sizes="44px" className="object-cover" unoptimized /> : <UserRound size={20} aria-hidden="true" />}</Link>
          </header>
        )}
        <main className="page-canvas">{children}</main>
        {pathname !== "/" && (
          <nav className="mobile-dock" aria-label="Primary navigation">
            {destinations.slice(0, 2).map(({ name, href, icon: Icon, glyph }) => {
              const active = isActive(href);
              return <Link key={name} href={href} className={`dock-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
                <span className="dock-icon">{active ? <ActiveGlyph kind={glyph} /> : <Icon size={21} strokeWidth={1.75} aria-hidden="true" />}</span><span>{name}</span>
              </Link>;
            })}
            <button type="button" className="dock-action" onClick={() => setActionsOpen(true)} aria-label="Money actions" aria-haspopup="dialog" aria-expanded={actionsOpen}><Plus size={22} strokeWidth={2} aria-hidden="true" /></button>
            {destinations.slice(2).map(({ name, href, icon: Icon, glyph }) => {
              const active = isActive(href);
              return <Link key={name} href={href} className={`dock-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
                <span className="dock-icon">{active ? <ActiveGlyph kind={glyph} /> : <Icon size={21} strokeWidth={1.75} aria-hidden="true" />}</span><span>{name}</span>
              </Link>;
            })}
          </nav>
        )}
      </section>
      <MoneyActionMenu open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </div>
  );
}
