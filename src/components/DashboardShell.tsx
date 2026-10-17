"use client";

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	ChevronsLeft,
	ChevronsRight,
	LayoutDashboard,
	LogOut,
	Menu,
	Package,
	ShieldCheck,
	Users,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
	{ to: "/products", label: "Products", icon: Package, adminOnly: false },
	{ to: "/users", label: "Users", icon: Users, adminOnly: true },
] as const;

export default function DashboardShell({ children }: { children: React.ReactNode }) {
	const { user, role } = useAuth();
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	// Polish the mobile drawer: close on Escape, lock background scrolling, and
	// move focus into the drawer so keyboard/screen-reader users land inside it.
	useEffect(() => {
		if (!mobileOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setMobileOpen(false);
		};
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		document.addEventListener("keydown", onKeyDown);
		closeButtonRef.current?.focus();
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = previousOverflow;
		};
	}, [mobileOpen]);

	const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");
	const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

	const handleSignOut = async () => {
		await authClient.signOut();
		await navigate({ to: "/login" });
	};

	return (
		<div className="flex min-h-screen">
			{mobileOpen && (
				<button
					type="button"
					aria-label="Close navigation"
					onClick={() => setMobileOpen(false)}
					className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
				/>
			)}

			<aside
				id="admin-sidebar"
				aria-label="Admin navigation"
				className={cn(
					"fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
					mobileOpen ? "translate-x-0" : "-translate-x-full",
					collapsed ? "lg:w-[4.75rem]" : "lg:w-64",
				)}
			>
				<div
					className={cn(
						"flex h-16 shrink-0 items-center gap-2 border-b border-[var(--line)] px-4",
						collapsed && "lg:justify-center lg:px-2",
					)}
				>
					<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#56c6be,#7ed3bf)] text-white">
						<ShieldCheck className="size-4" />
					</span>
					{!collapsed && (
						<span className="truncate font-bold tracking-tight text-[var(--sea-ink)]">
							Ekraf Admin
						</span>
					)}
					<button
						ref={closeButtonRef}
						type="button"
						aria-label="Close navigation"
						onClick={() => setMobileOpen(false)}
						className="ml-auto rounded-md p-1 text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--lagoon-deep)] focus-visible:outline-none lg:hidden"
					>
						<X className="size-4" />
					</button>
				</div>

				<nav className="flex-1 space-y-1 overflow-y-auto p-3">
					{items.map((item) => {
						const active = isActive(item.to);
						return (
							<Link
								key={item.to}
								to={item.to}
								title={item.label}
								aria-current={active ? "page" : undefined}
								onClick={() => setMobileOpen(false)}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition",
									active
										? "bg-[var(--link-bg-hover)] text-[var(--sea-ink)] shadow-[inset_2px_0_0_var(--lagoon-deep)]"
										: "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]",
									collapsed && "lg:justify-center lg:px-2",
								)}
							>
								<item.icon className="size-4 shrink-0" />
								{!collapsed && <span className="truncate">{item.label}</span>}
							</Link>
						);
					})}
				</nav>

				<div className="shrink-0 border-t border-[var(--line)] p-3">
					<div
						className={cn(
							"mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5",
							collapsed && "lg:justify-center lg:px-0",
						)}
					>
						<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--chip-bg)] text-xs font-semibold text-[var(--sea-ink)]">
							{(user.name?.charAt(0) || user.email.charAt(0)).toUpperCase()}
						</span>
						{!collapsed && (
							<div className="min-w-0">
								<p className="truncate text-sm font-medium text-[var(--sea-ink)]">
									{user.name ?? user.email}
								</p>
								<p className="truncate text-xs text-[var(--sea-ink-soft)]">
									{role === "admin" ? "Administrator" : "User"}
								</p>
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={handleSignOut}
						title="Sign out"
						className={cn(
							"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]",
							collapsed && "lg:justify-center lg:px-2",
						)}
					>
						<LogOut className="size-4 shrink-0" />
						{!collapsed && <span>Sign out</span>}
					</button>
					<button
						type="button"
						onClick={() => setCollapsed((value) => !value)}
						className={cn(
							"mt-1 hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] lg:flex",
							collapsed && "lg:justify-center lg:px-2",
						)}
					>
						{collapsed ? (
							<ChevronsRight className="size-4 shrink-0" />
						) : (
							<>
								<ChevronsLeft className="size-4 shrink-0" />
								<span>Collapse</span>
							</>
						)}
					</button>
				</div>
			</aside>

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 py-3 backdrop-blur-lg lg:hidden">
					<button
						type="button"
						aria-label="Open navigation"
						aria-controls="admin-sidebar"
						aria-expanded={mobileOpen}
						onClick={() => setMobileOpen(true)}
						className="rounded-md p-1.5 text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--lagoon-deep)] focus-visible:outline-none"
					>
						<Menu className="size-5" />
					</button>
					<span className="font-bold tracking-tight text-[var(--sea-ink)]">Ekraf Admin</span>
					<div className="ml-auto">
						<ThemeToggle />
					</div>
				</header>

				<main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
			</div>
		</div>
	);
}
