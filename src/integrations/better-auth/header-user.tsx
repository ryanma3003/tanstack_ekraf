import { Link } from "@tanstack/react-router";
import { LogOut, UserRound } from "lucide-react";
import { authClient } from "#/lib/auth-client";

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <div className="h-9 w-24 animate-pulse rounded-xl bg-[var(--chip-bg)]" />;
  if (session?.user) return <div className="flex items-center gap-2"><span className="hidden max-w-36 truncate text-xs font-semibold text-[var(--sea-ink-soft)] lg:block">{session.user.name || session.user.email}</span><button type="button" onClick={() => { void authClient.signOut(); }} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"><LogOut size={15} /> Sign out</button></div>;
  return <Link to="/login" className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--sea-ink)] px-4 text-sm font-bold text-white no-underline hover:-translate-y-0.5"><UserRound size={15} /> Sign in</Link>;
}
