import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	Boxes,
	History,
	Lock,
	Package,
	RefreshCw,
	ShieldCheck,
	Users,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { getAuditLog } from "@/lib/server/audit";
import { getDashboardStats } from "@/lib/server/dashboard";

export const Route = createFileRoute("/_admin/dashboard")({
	head: () => ({ meta: [{ title: "Dashboard · Ekraf Admin" }] }),
	component: Dashboard,
});

function Dashboard() {
	const { role } = useAuth();
	const statsQuery = useQuery({
		queryKey: ["dashboard", "stats"],
		queryFn: async () => getDashboardStats(),
	});
	const auditQuery = useQuery({
		queryKey: ["dashboard", "audit"],
		queryFn: async () => getAuditLog(),
		enabled: role === "admin",
	});

	const stats = statsQuery.data;

	return (
		<div className="mx-auto max-w-5xl">
			<PageHeader
				kicker="Dashboard"
				title={`Welcome back${stats?.displayName ? `, ${stats.displayName.split(" ")[0]}` : ""}`}
				description="A snapshot of the catalogue and account activity. Every write is authorised and validated on the server."
				actions={
					<Link
						to="/products"
						className="inline-flex items-center gap-2 rounded-lg bg-[var(--sea-ink)] px-4 py-2.5 text-sm font-semibold text-[var(--foam)] no-underline transition hover:opacity-90"
					>
						<Package className="size-4" />
						Manage products
					</Link>
				}
			/>

			{statsQuery.isError ? (
				<div className="island-shell rounded-2xl p-6 text-center">
					<AlertTriangle className="mx-auto mb-3 size-6 text-red-600" />
					<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
						Could not load dashboard metrics: {(statsQuery.error as Error).message}
					</p>
					<button
						type="button"
						onClick={() => void statsQuery.refetch()}
						className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)]"
					>
						<RefreshCw className="size-4" />
						Retry
					</button>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{statsQuery.isPending ? (
						<>
							<StatSkeleton />
							<StatSkeleton />
							<StatSkeleton />
							<StatSkeleton />
						</>
					) : (
						<>
							<StatCard
								icon={Boxes}
								label="Products"
								value={stats?.productCount ?? 0}
								hint="In the catalogue"
							/>
							<StatCard
								icon={AlertTriangle}
								label="Low stock"
								value={stats?.lowStock ?? 0}
								hint="3 units or fewer"
								tone={(stats?.lowStock ?? 0) > 0 ? "warning" : "default"}
							/>
							<StatCard
								icon={Users}
								label="Users"
								value={stats?.userCount}
								hint={role === "admin" ? "Total accounts" : "Administrators only"}
								locked={role !== "admin"}
							/>
							<StatCard
								icon={ShieldCheck}
								label="Administrators"
								value={stats?.adminCount}
								hint={role === "admin" ? "Full-access accounts" : "Administrators only"}
								locked={role !== "admin"}
							/>
						</>
					)}
				</div>
			)}

			<div className="mt-8 grid gap-4 lg:grid-cols-2">
				<QuickLinkCard
					icon={Package}
					title="Products"
					description="Create, edit and delete catalogue items."
					to="/products"
				/>
				{role === "admin" ? (
					<QuickLinkCard
						icon={Users}
						title="Users & roles"
						description="Promote or demote accounts and remove users."
						to="/users"
					/>
				) : (
					<div className="island-shell flex items-center gap-4 rounded-2xl p-5 opacity-80">
						<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]">
							<Lock className="size-5" />
						</span>
						<div>
							<p className="m-0 font-semibold text-[var(--sea-ink)]">Users & roles</p>
							<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
								Administrator access required.
							</p>
						</div>
					</div>
				)}
			</div>

			{role === "admin" && (
				<section className="island-shell mt-8 rounded-2xl p-6">
					<div className="mb-4 flex items-center gap-2">
						<History className="size-4 text-[var(--sea-ink-soft)]" />
						<h2 className="m-0 text-sm font-semibold tracking-wide text-[var(--sea-ink)] uppercase">
							Recent admin activity
						</h2>
					</div>

					{auditQuery.isPending ? (
						<div className="space-y-2">
							{[0, 1, 2].map((key) => (
								<div key={key} className="h-10 animate-pulse rounded-lg bg-[var(--chip-bg)]" />
							))}
						</div>
					) : auditQuery.isError ? (
						<p className="m-0 text-sm text-red-600">
							Could not load activity: {(auditQuery.error as Error).message}
						</p>
					) : (auditQuery.data?.length ?? 0) === 0 ? (
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
							No admin activity recorded yet. Actions you take will appear here.
						</p>
					) : (
						<ul className="m-0 list-none space-y-2 p-0">
							{auditQuery.data?.map((entry) => (
								<li
									key={entry.id}
									className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-2 text-sm"
								>
									<span className="font-medium text-[var(--sea-ink)]">
										{entry.action}
										{entry.detail ? (
											<span className="font-normal text-[var(--sea-ink-soft)]">
												{" — "}
												{entry.detail}
											</span>
										) : null}
									</span>
									<span className="text-xs text-[var(--sea-ink-soft)]">
										{entry.actorEmail} · {new Date(entry.at).toLocaleString()}
									</span>
								</li>
							))}
						</ul>
					)}
				</section>
			)}
		</div>
	);
}

function StatCard({
	icon: Icon,
	label,
	value,
	hint,
	locked = false,
	tone = "default",
}: {
	icon: typeof Boxes;
	label: string;
	value: number | null | undefined;
	hint: string;
	locked?: boolean;
	tone?: "default" | "warning";
}) {
	return (
		<div className="island-shell rounded-2xl p-5">
			<div className="flex items-center justify-between">
				<span
					className={`flex size-9 items-center justify-center rounded-lg ${
						tone === "warning"
							? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
							: "bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]"
					}`}
				>
					{locked ? <Lock className="size-4" /> : <Icon className="size-4" />}
				</span>
			</div>
			<p className="mt-4 text-3xl font-bold text-[var(--sea-ink)]">
				{locked || value === null || value === undefined ? "—" : value}
			</p>
			<p className="mt-1 text-sm font-medium text-[var(--sea-ink)]">{label}</p>
			<p className="m-0 text-xs text-[var(--sea-ink-soft)]">{hint}</p>
		</div>
	);
}

function StatSkeleton() {
	return (
		<div className="island-shell rounded-2xl p-5">
			<div className="h-9 w-9 animate-pulse rounded-lg bg-[var(--chip-bg)]" />
			<div className="mt-4 h-8 w-16 animate-pulse rounded bg-[var(--chip-bg)]" />
			<div className="mt-2 h-3 w-20 animate-pulse rounded bg-[var(--chip-bg)]" />
		</div>
	);
}

function QuickLinkCard({
	icon: Icon,
	title,
	description,
	to,
}: {
	icon: typeof Boxes;
	title: string;
	description: string;
	to: "/products" | "/users";
}) {
	return (
		<Link
			to={to}
			className="island-shell group flex items-center gap-4 rounded-2xl p-5 no-underline transition hover:-translate-y-0.5"
		>
			<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--sea-ink)]">
				<Icon className="size-5" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="m-0 font-semibold text-[var(--sea-ink)]">{title}</p>
				<p className="m-0 text-sm text-[var(--sea-ink-soft)]">{description}</p>
			</div>
			<ArrowRight className="size-4 shrink-0 text-[var(--sea-ink-soft)] transition group-hover:translate-x-0.5" />
		</Link>
	);
}
