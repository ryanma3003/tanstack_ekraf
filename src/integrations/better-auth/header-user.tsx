import { Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";

export default function BetterAuthHeader() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();

	if (isPending) {
		return <div className="h-9 w-24 animate-pulse rounded-md bg-[var(--chip-bg)]" />;
	}

	if (session?.user) {
		return (
			<div className="flex items-center gap-2">
				{session.user.image ? (
					<img src={session.user.image} alt="" className="size-8 rounded-full object-cover" />
				) : (
					<span className="flex size-8 items-center justify-center rounded-full bg-[var(--chip-bg)] text-xs font-semibold text-[var(--sea-ink)]">
						{(session.user.name?.charAt(0) || session.user.email.charAt(0)).toUpperCase()}
					</span>
				)}
				<button
					type="button"
					onClick={async () => {
						await authClient.signOut();
						await navigate({ to: "/login" });
					}}
					className="h-9 rounded-md border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 text-sm font-medium text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
				>
					Sign out
				</button>
			</div>
		);
	}

	return (
		<Link
			to="/login"
			className="inline-flex h-9 items-center rounded-md border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 text-sm font-medium text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)]"
		>
			Sign in
		</Link>
	);
}
