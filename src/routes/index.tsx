import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Package, ShieldCheck, Users, Zap } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
	head: () => ({ meta: [{ title: "Ekraf Admin Dashboard" }] }),
	component: Home,
});

function Home() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<main className="page-wrap px-4 py-12 sm:py-16">
			<section className="rise-in island-shell rounded-3xl px-6 py-10 sm:px-10 sm:py-14">
				<p className="island-kicker mb-3">Ekraf Dashboard</p>
				<h1 className="display-title m-0 max-w-3xl text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
					A secure admin dashboard for your catalogue
				</h1>
				<p className="mt-4 max-w-2xl text-base leading-8 text-[var(--sea-ink-soft)]">
					Manage products and user roles with server-enforced authorisation, server-side validation
					and an audit trail of every administrator action. Built with TanStack Start, TanStack
					Query/Table/Form and Better Auth.
				</p>

				<div className="mt-8 flex flex-wrap items-center gap-3">
					{isPending ? (
						<div className="h-11 w-40 animate-pulse rounded-lg bg-[var(--chip-bg)]" />
					) : session?.user ? (
						<>
							<Link
								to="/dashboard"
								className="inline-flex items-center gap-2 rounded-lg bg-[var(--sea-ink)] px-5 py-3 text-sm font-semibold text-[var(--foam)] no-underline transition hover:opacity-90"
							>
								Open dashboard
								<ArrowRight className="size-4" />
							</Link>
							<span className="text-sm text-[var(--sea-ink-soft)]">
								Signed in as <span className="font-semibold">{session.user.email}</span>
							</span>
						</>
					) : (
						<>
							<Link
								to="/login"
								className="inline-flex items-center gap-2 rounded-lg bg-[var(--sea-ink)] px-5 py-3 text-sm font-semibold text-[var(--foam)] no-underline transition hover:opacity-90"
							>
								Sign in
								<ArrowRight className="size-4" />
							</Link>
							<Link
								to="/setup"
								className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-5 py-3 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)]"
							>
								Seed admin account
							</Link>
						</>
					)}
				</div>
			</section>

			<section className="mt-8 grid gap-4 sm:grid-cols-3">
				<FeatureCard
					icon={Package}
					title="Product catalogue"
					description="Create, edit and delete products in a modal flow with image upload, preview and validation."
				/>
				<FeatureCard
					icon={Users}
					title="Users & roles"
					description="Promote or demote accounts. Self-demotion and the last administrator are protected."
				/>
				<FeatureCard
					icon={ShieldCheck}
					title="Hardened by default"
					description="Server-side authorisation and Zod validation on every write, rate-limited sign-in and secure cookies."
				/>
			</section>

			<section className="mt-8">
				<div className="island-shell flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3">
						<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--sea-ink)]">
							<Zap className="size-5" />
						</span>
						<div>
							<p className="m-0 font-semibold text-[var(--sea-ink)]">
								No database — data lives in memory
							</p>
							<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
								Run the one-time seed on <Link to="/setup">/setup</Link> after each restart or
								deploy to recreate the admin account and sample products.
							</p>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}

function FeatureCard({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof Package;
	title: string;
	description: string;
}) {
	return (
		<div className="island-shell feature-card rounded-2xl p-5">
			<span className="flex size-10 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--sea-ink)]">
				<Icon className="size-5" />
			</span>
			<p className="mt-4 font-semibold text-[var(--sea-ink)]">{title}</p>
			<p className="m-0 mt-1 text-sm leading-6 text-[var(--sea-ink-soft)]">{description}</p>
		</div>
	);
}
