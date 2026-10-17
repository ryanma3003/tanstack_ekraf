import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Package2, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import BetterAuthHeader from "../integrations/better-auth/header-user";
import ThemeToggle from "./ThemeToggle";

const publicLinks = [{ to: "/" as const, label: "Home" }, { to: "/setup" as const, label: "Setup" }];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDashboardArea = ["/dashboard", "/products", "/users"].some((path) => pathname === path || pathname.startsWith(path + "/"));

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-xl">
      <nav className="page-wrap flex min-h-16 items-center justify-between gap-4 py-3">
        <Link to="/" className="flex items-center gap-3 no-underline" aria-label="EKRAF home">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--lagoon)] text-[#123b3a] shadow-sm"><Package2 size={21} strokeWidth={2.4} /></span>
          <span className="leading-tight"><span className="block text-sm font-extrabold tracking-tight text-[var(--sea-ink)]">EKRAF</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">Commerce studio</span></span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {publicLinks.map((item) => <Link key={item.to} to={item.to} className={`rounded-xl px-4 py-2 text-sm font-semibold no-underline transition ${pathname === item.to ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]" : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"}`}>{item.label}</Link>)}
          {isDashboardArea && <><Link to="/dashboard" className={`rounded-xl px-4 py-2 text-sm font-semibold no-underline ${pathname === "/dashboard" ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]" : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"}`}>Dashboard</Link><Link to="/products" className={`rounded-xl px-4 py-2 text-sm font-semibold no-underline ${pathname.startsWith("/products") ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]" : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"}`}>Products</Link><Link to="/users" className={`rounded-xl px-4 py-2 text-sm font-semibold no-underline ${pathname.startsWith("/users") ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]" : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"}`}>Users</Link></>}
        </div>
        <div className="hidden items-center gap-2 md:flex"><span className="hidden items-center gap-1.5 text-xs font-semibold text-[var(--sea-ink-soft)] lg:flex"><ShieldCheck size={15} /> Secure workspace</span><BetterAuthHeader /><ThemeToggle /></div>
        <div className="flex items-center gap-2 md:hidden"><ThemeToggle /><button type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink)]">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button></div>
      </nav>
      {mobileOpen && <div className="border-t border-[var(--line)] bg-[var(--header-bg)] px-4 py-4 md:hidden"><div className="page-wrap grid gap-1">
        {publicLinks.map((item) => <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--sea-ink)] no-underline hover:bg-[var(--link-bg-hover)]">{item.label}</Link>)}
        <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--sea-ink)] no-underline hover:bg-[var(--link-bg-hover)]">Dashboard</Link><Link to="/products" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--sea-ink)] no-underline hover:bg-[var(--link-bg-hover)]">Products</Link><Link to="/users" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--sea-ink)] no-underline hover:bg-[var(--link-bg-hover)]">Users</Link>
        <div className="flex items-center justify-between border-t border-[var(--line)] pt-3"><BetterAuthHeader /></div>
      </div></div>}
    </header>
  );
}
