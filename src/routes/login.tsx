"use client";

import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";

import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { getServerSession } from "@/lib/server/auth";

export const Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Sign in · Ekraf Admin" }] }),
	beforeLoad: async () => {
		// Already signed in? Skip the form.
		const { session } = await getServerSession();
		if (session) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError("");

		if (!email.trim() || !password) {
			setError("Enter your email and password.");
			return;
		}

		setSubmitting(true);
		try {
			const { error: signInError } = await authClient.signIn.email({
				email: email.trim(),
				password,
			});

			if (signInError) {
				setError(messageForError(signInError));
				return;
			}

			await navigate({ to: "/dashboard" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>

			<div className="w-full max-w-md">
				<div className="mb-6 flex flex-col items-center text-center">
					<span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#56c6be,#7ed3bf)] text-white shadow-lg">
						<ShieldCheck className="size-6" />
					</span>
					<h1 className="display-title m-0 text-3xl font-bold text-[var(--sea-ink)]">
						Ekraf Admin
					</h1>
					<p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
						Sign in to manage products and users.
					</p>
				</div>

				<div className="island-shell rounded-2xl p-6 sm:p-8">
					<form onSubmit={handleSubmit} className="space-y-4" noValidate>
						{error && (
							<p
								role="alert"
								className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
							>
								<AlertCircle className="mt-0.5 size-4 shrink-0" />
								<span>{error}</span>
							</p>
						)}

						<div className="space-y-1.5">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								placeholder="you@example.com"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								disabled={submitting}
								required
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								placeholder="••••••••"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								disabled={submitting}
								required
							/>
						</div>

						<Button type="submit" className="w-full" disabled={submitting}>
							{submitting ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<LogIn className="size-4" />
							)}
							{submitting ? "Signing in..." : "Sign in"}
						</Button>
					</form>

					<div className="mt-6 space-y-3 border-t border-[var(--line)] pt-5 text-center text-sm text-[var(--sea-ink-soft)]">
						<p className="m-0">
							First time here?{" "}
							<Link
								to="/setup"
								className="font-medium underline underline-offset-4 hover:text-[var(--sea-ink)]"
							>
								Seed the admin account
							</Link>
						</p>
						<p className="m-0">
							<Link
								to="/"
								className="inline-flex items-center gap-1.5 font-medium no-underline hover:text-[var(--sea-ink)]"
							>
								<ArrowLeft className="size-4" />
								Back to home
							</Link>
						</p>
					</div>
				</div>
			</div>
		</main>
	);
}

function messageForError(error: { status?: number; message?: string }): string {
	if (error.status === 429) {
		return "Too many sign-in attempts. Please wait a minute and try again.";
	}
	if (error.status === 401 || error.status === 400) {
		return "Incorrect email or password. Please try again.";
	}
	return error.message || "Unable to sign in right now. Please try again.";
}
