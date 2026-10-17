import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import BetterAuthHeader from "../integrations/better-auth/header-user.tsx";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
			<nav className="page-wrap flex items-center gap-4 py-3 sm:py-4">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--sea-ink)] no-underline"
				>
					<span className="flex size-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#56c6be,#7ed3bf)] text-white">
						<ShieldCheck className="size-4" />
					</span>
					Ekraf Admin
				</Link>

				<div className="hidden items-center gap-4 text-sm font-semibold sm:flex">
					<Link to="/" className="nav-link" activeProps={{ className: "nav-link is-active" }}>
						Home
					</Link>
					<Link
						to="/dashboard"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Dashboard
					</Link>
					<Link to="/setup" className="nav-link" activeProps={{ className: "nav-link is-active" }}>
						Setup
					</Link>
				</div>

				<div className="ml-auto flex items-center gap-2">
					<BetterAuthHeader />
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
