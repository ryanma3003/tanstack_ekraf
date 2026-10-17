import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createColumnHelper, flexRender, tableFeatures, useTable } from "@tanstack/react-table";
import { ShieldCheck, Shield, Trash2, Users, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Role } from "@/lib/db";
import { getServerSession } from "@/lib/server/auth";
import { deleteUser, getUsers, updateUserRole } from "@/lib/server/users";

type UserRow = { id: string; email: string; name: string | null; role: Role; emailVerified: boolean; createdAt: string; };
export const Route = createFileRoute("/users/")({ beforeLoad: async () => { const { session } = await getServerSession(); if (!session) throw redirect({ to: "/login" }); }, component: UsersPage });
function UsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: async () => getUsers() });
  const updateRoleFn = useServerFn(updateUserRole); const deleteFn = useServerFn(deleteUser);
  const [search, setSearch] = useState(""); const [busyUser, setBusyUser] = useState(""); const [error, setError] = useState("");
  const users = usersQuery.data ?? [];
  const filteredUsers = useMemo(() => users.filter((user) => `${user.name ?? ""} ${user.email}`.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const adminCount = users.filter((user) => user.role === "admin").length;
  const changeRole = async (userId: string, role: Role) => {
    setBusyUser(userId); setError("");
    try { await updateRoleFn({ data: { userId, role } }); await queryClient.invalidateQueries({ queryKey: ["users"] }); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update role."); }
    finally { setBusyUser(""); }
  };
  const removeUser = async (userId: string) => {
    if (!window.confirm("Delete this user account? This action cannot be undone.")) return;
    setBusyUser(userId); setError("");
    try { await deleteFn({ data: { userId } }); await queryClient.invalidateQueries({ queryKey: ["users"] }); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete user."); }
    finally { setBusyUser(""); }
  };
  const features = tableFeatures({});
  const helper = createColumnHelper<typeof features, UserRow>();
  const columns = helper.columns([
    helper.accessor("name", { header: "User", cell: (info) => <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--hero-a)] text-sm font-extrabold text-[var(--sea-ink)]">{(info.getValue() || info.row.original.email).charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="m-0 truncate text-sm font-bold text-[var(--sea-ink)]">{info.getValue() || "Unnamed user"}</p><p className="m-0 mt-1 truncate text-xs text-[var(--sea-ink-soft)]">{info.row.original.email}</p></div></div> }),
    helper.accessor("role", { header: "Role", cell: (info) => <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${info.getValue() === "admin" ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" : "bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]"}`}>{info.getValue() === "admin" ? <ShieldCheck size={13} /> : <Shield size={13} />}{info.getValue() === "admin" ? "Administrator" : "User"}</span> }),
    helper.accessor("emailVerified", { header: "Email status", cell: (info) => <span className={`text-xs font-semibold ${info.getValue() ? "text-emerald-700 dark:text-emerald-300" : "text-[var(--sea-ink-soft)]"}`}>{info.getValue() ? "Verified" : "Unverified"}</span> }),
    helper.accessor("createdAt", { header: "Joined", cell: (info) => <span className="text-xs text-[var(--sea-ink-soft)]">{new Date(info.getValue()).toLocaleDateString()}</span> }),
    helper.display({ id: "actions", header: "Actions", cell: (info) => {
      const user = info.row.original;
      return <div className="flex items-center gap-2"><select aria-label={`Change role for ${user.email}`} disabled={busyUser === user.id || (user.role === "admin" && adminCount <= 1)} value={user.role} onChange={(event) => void changeRole(user.id, event.target.value as Role)} className="max-w-36 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-2 text-xs font-semibold text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)] disabled:opacity-50"><option value="user">User</option><option value="admin">Administrator</option></select><button type="button" onClick={() => void removeUser(user.id)} disabled={busyUser === user.id || (user.role === "admin" && adminCount <= 1)} aria-label={`Delete ${user.email}`} title={user.role === "admin" && adminCount <= 1 ? "Cannot delete the last admin" : "Delete user"} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">{busyUser === user.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 size={15} />}</button></div>;
    } }),
  ]);
  const table = useTable({ features, columns, data: filteredUsers });
  return <main className="px-0 py-2 sm:py-3">
    <div className="mb-7"><p className="island-kicker mb-2">Access management</p><h1 className="display-title mb-2 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">Users</h1><p className="m-0 text-sm leading-6 text-[var(--sea-ink-soft)]">Manage workspace accounts and access levels securely.</p></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><Summary icon={<Users size={18} />} label="Total users" value={usersQuery.isPending ? "—" : String(users.length)} /><Summary icon={<ShieldCheck size={18} />} label="Administrators" value={usersQuery.isPending ? "—" : String(adminCount)} /><Summary icon={<Shield size={18} />} label="Standard users" value={usersQuery.isPending ? "—" : String(users.length - adminCount)} /></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:px-5"><div><h2 className="m-0 text-sm font-extrabold text-[var(--sea-ink)]">Workspace members</h2><p className="mb-0 mt-1 text-xs text-[var(--sea-ink-soft)]">{usersQuery.isPending ? "Loading accounts…" : `${filteredUsers.length} of ${users.length} users`}</p></div><div className="relative w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search users" placeholder="Search name or email..." className="w-full rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)] focus:ring-2 focus:ring-[var(--hero-a)]" /></div></div>
      {usersQuery.isPending ? <div className="grid gap-3 p-5">{[1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--chip-bg)]" />)}</div> : usersQuery.isError ? <div role="alert" className="p-8 text-center text-sm text-red-600">Could not load users. Make sure the signed-in account has administrator access.</div> : filteredUsers.length === 0 ? <div className="p-12 text-center"><Users size={28} className="mx-auto mb-3 text-[var(--sea-ink-soft)]" /><h3 className="m-0 text-base font-bold text-[var(--sea-ink)]">{search ? "No users found" : "No users yet"}</h3><p className="mb-0 mt-2 text-sm text-[var(--sea-ink-soft)]">{search ? "Try another search term." : "Accounts will appear here after users sign up."}</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-[var(--chip-bg)]"><tr>{table.getHeaderGroups().map((group) => group.headers.map((header) => <th key={header.id} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--sea-ink-soft)]">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>))}</tr></thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className="border-t border-[var(--line)] hover:bg-[var(--link-bg-hover)]">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-5 py-4 align-middle">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>
        <div className="grid gap-3 p-3 md:hidden">{filteredUsers.map((user) => <article key={user.id} className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--hero-a)] text-sm font-extrabold text-[var(--sea-ink)]">{(user.name || user.email).charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><h3 className="m-0 break-all text-sm font-extrabold text-[var(--sea-ink)]">{user.name || "Unnamed user"}</h3><p className="mb-2 mt-1 break-all text-xs text-[var(--sea-ink-soft)]">{user.email}</p><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${user.role === "admin" ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" : "bg-[var(--hero-a)] text-[var(--sea-ink)]"}`}>{user.role === "admin" ? "Administrator" : "User"}</span></div></div><div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3"><select aria-label={`Change role for ${user.email}`} disabled={busyUser === user.id || (user.role === "admin" && adminCount <= 1)} value={user.role} onChange={(event) => void changeRole(user.id, event.target.value as Role)} className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold text-[var(--sea-ink)] disabled:opacity-50"><option value="user">User</option><option value="admin">Administrator</option></select><button type="button" onClick={() => void removeUser(user.id)} disabled={busyUser === user.id || (user.role === "admin" && adminCount <= 1)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-40 dark:border-red-900 dark:text-red-300"><Trash2 size={13} /> Delete</button></div></article>)}</div>
      </>}
    </section><p className="mt-4 text-xs leading-5 text-[var(--sea-ink-soft)]">Protection: the last administrator cannot be removed. Self-role demotion and self-deletion are blocked on the server.</p>
  </main>;
}
function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hero-a)] text-[var(--sea-ink)]">{icon}</span><div><p className="m-0 text-xs font-semibold text-[var(--sea-ink-soft)]">{label}</p><p className="m-0 mt-1 text-2xl font-extrabold text-[var(--sea-ink)]">{value}</p></div></div>; }
