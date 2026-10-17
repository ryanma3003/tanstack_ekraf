"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	createColumnHelper,
	createSortedRowModel,
	flexRender,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_text,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import {
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Lock,
	RefreshCw,
	ShieldCheck,
	Trash2,
	UserCog,
	Users,
} from "lucide-react";
import { useState } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import UserRoleModal from "@/components/users/UserRoleModal";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/db";
import { deleteUser, getUsers } from "@/lib/server/users";

export const Route = createFileRoute("/_admin/users/")({
	head: () => ({ meta: [{ title: "Users · Ekraf Admin" }] }),
	component: UsersPage,
});

interface UserRow {
	id: string;
	email: string;
	name: string | null;
	role: Role;
	emailVerified: boolean;
	createdAt: string;
}

const features = tableFeatures({
	rowSortingFeature,
	// Without `sortedRowModel` the sorting state is tracked but never applied to
	// the row model, so the header toggle appears to do nothing.
	sortedRowModel: createSortedRowModel(),
	sortFns: { text: sortFn_text, alphanumeric: sortFn_alphanumeric },
});
const columnHelper = createColumnHelper<typeof features, UserRow>();

function UsersPage() {
	const { user: currentUser, role } = useAuth();
	const queryClient = useQueryClient();
	const deleteFn = useServerFn(deleteUser);

	const usersQuery = useQuery({
		queryKey: ["users"],
		queryFn: async () => getUsers(),
	});

	const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
	const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");

	const users = usersQuery.data ?? [];
	const adminCount = users.filter((entry) => entry.role === "admin").length;

	// A non-admin should never see this page; `getUsers` also rejects them on the
	// server, but we surface a friendly state instead of an error.
	if (role !== "admin") {
		return (
			<div className="mx-auto max-w-5xl">
				<PageHeader kicker="Users" title="Users & roles" />
				<div className="island-shell flex items-center gap-4 rounded-2xl p-6">
					<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]">
						<Lock className="size-5" />
					</span>
					<div>
						<p className="m-0 font-semibold text-[var(--sea-ink)]">Administrator access required</p>
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
							Only administrators can view and manage user accounts.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const refresh = async () => {
		await queryClient.invalidateQueries({ queryKey: ["users"] });
		await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
	};

	const openRole = (target: UserRow) => {
		setRoleTarget(target);
	};

	const lockReasonFor = (target: UserRow): string | null => {
		if (target.id === currentUser.id) {
			return "You cannot change your own role. Ask another administrator to do it.";
		}
		if (target.role === "admin" && adminCount <= 1) {
			return "This is the last administrator. Promote another account first.";
		}
		return null;
	};

	const deleteBlockReason = (target: UserRow): string | null => {
		if (target.id === currentUser.id) {
			return "You cannot delete your own account.";
		}
		if (target.role === "admin" && adminCount <= 1) {
			return "You cannot delete the last administrator.";
		}
		return null;
	};

	const confirmDelete = async () => {
		if (!pendingDelete) return;
		setDeleting(true);
		setDeleteError("");
		try {
			await deleteFn({ data: { userId: pendingDelete.id } });
			await refresh();
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(err instanceof Error ? err.message : "Could not delete this user.");
		} finally {
			setDeleting(false);
		}
	};

	const roleLabel = (value: Role) => (value === "admin" ? "Administrator" : "User");

	const columns = columnHelper.columns([
		columnHelper.accessor("email", {
			header: "User",
			cell: (info) => {
				const entry = info.row.original;
				return (
					<div className="flex items-center gap-3">
						<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--chip-bg)] text-xs font-semibold text-[var(--sea-ink)]">
							{(entry.name?.charAt(0) || entry.email.charAt(0)).toUpperCase()}
						</span>
						<div className="min-w-0">
							<p className="m-0 flex items-center gap-2 font-medium text-[var(--sea-ink)]">
								{entry.name ?? "Unnamed"}
								{entry.id === currentUser.id && (
									<span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--sea-ink-soft)]">
										You
									</span>
								)}
							</p>
							<p className="m-0 truncate text-xs text-[var(--sea-ink-soft)]">{entry.email}</p>
						</div>
					</div>
				);
			},
		}),
		columnHelper.accessor("role", {
			header: "Role",
			cell: (info) => {
				const value = info.getValue();
				return (
					<span
						className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
							value === "admin"
								? "bg-[var(--lagoon)]/20 text-[var(--lagoon-deep)]"
								: "bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]"
						}`}
					>
						{value === "admin" && <ShieldCheck className="size-3" />}
						{roleLabel(value)}
					</span>
				);
			},
		}),
		columnHelper.accessor("emailVerified", {
			header: "Verified",
			enableSorting: false,
			cell: (info) => (
				<span className="text-sm text-[var(--sea-ink-soft)]">{info.getValue() ? "Yes" : "No"}</span>
			),
		}),
		columnHelper.accessor("createdAt", {
			header: "Joined",
			cell: (info) => (
				<span className="text-sm text-[var(--sea-ink-soft)]">
					{new Date(info.getValue()).toLocaleDateString()}
				</span>
			),
		}),
		columnHelper.display({
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			enableSorting: false,
			cell: (info) => {
				const entry = info.row.original;
				const blockReason = deleteBlockReason(entry);
				return (
					<div className="flex items-center justify-end gap-1">
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={`Change role for ${entry.email}`}
							onClick={() => openRole(entry)}
						>
							<UserCog className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={
								blockReason
									? `Delete ${entry.email} (blocked: ${blockReason})`
									: `Delete ${entry.email}`
							}
							title={blockReason ?? undefined}
							disabled={Boolean(blockReason)}
							className="text-destructive hover:text-destructive"
							onClick={() => {
								setDeleteError("");
								setPendingDelete(entry);
							}}
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				);
			},
		}),
	]);

	const table = useTable({ features, columns, data: users });

	return (
		<div className="mx-auto max-w-6xl">
			<PageHeader
				kicker="Access control"
				title="Users & roles"
				description="Promote or demote accounts and remove users. The last administrator and your own account are protected."
			/>

			{usersQuery.isError ? (
				<div className="island-shell rounded-2xl p-8 text-center">
					<AlertTriangle className="mx-auto mb-3 size-6 text-red-600" />
					<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
						Could not load users: {(usersQuery.error as Error).message}
					</p>
					<Button variant="outline" className="mt-4" onClick={() => void usersQuery.refetch()}>
						<RefreshCw className="size-4" />
						Retry
					</Button>
				</div>
			) : usersQuery.isPending ? (
				<div className="island-shell overflow-hidden rounded-2xl">
					{["a", "b", "c", "d"].map((key) => (
						<div
							key={key}
							className="flex items-center gap-4 border-b border-[var(--line)] px-4 py-4 last:border-0"
						>
							<div className="size-9 animate-pulse rounded-full bg-[var(--chip-bg)]" />
							<div className="h-3 flex-1 animate-pulse rounded bg-[var(--chip-bg)]" />
							<div className="hidden h-3 w-24 animate-pulse rounded bg-[var(--chip-bg)] sm:block" />
						</div>
					))}
				</div>
			) : users.length === 0 ? (
				<div className="island-shell rounded-2xl p-10 text-center">
					<span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]">
						<Users className="size-6" />
					</span>
					<p className="m-0 font-semibold text-[var(--sea-ink)]">No users yet</p>
					<p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">
						Accounts appear here once people sign up.
					</p>
				</div>
			) : (
				<>
					<div className="island-shell hidden overflow-hidden rounded-2xl md:block">
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								<thead>
									{table.getHeaderGroups().map((headerGroup) => (
										<tr key={headerGroup.id} className="border-b border-[var(--line)]">
											{headerGroup.headers.map((header) => {
												const sorted = header.column.getIsSorted();
												return (
													<th
														key={header.id}
														colSpan={header.colSpan}
														aria-sort={
															!header.column.getCanSort()
																? undefined
																: sorted === "asc"
																	? "ascending"
																	: sorted === "desc"
																		? "descending"
																		: "none"
														}
														className="bg-[var(--chip-bg)] px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--sea-ink-soft)] uppercase"
													>
														{header.isPlaceholder ? null : header.column.getCanSort() ? (
															<button
																type="button"
																onClick={header.column.getToggleSortingHandler()}
																className="inline-flex items-center gap-1.5 font-semibold text-inherit uppercase transition hover:text-[var(--sea-ink)] focus-visible:ring-2 focus-visible:ring-[var(--lagoon-deep)] focus-visible:outline-none"
															>
																{flexRender(header.column.columnDef.header, header.getContext())}
																{sorted === "asc" ? (
																	<ArrowUp className="size-3 text-[var(--lagoon-deep)]" />
																) : sorted === "desc" ? (
																	<ArrowDown className="size-3 text-[var(--lagoon-deep)]" />
																) : (
																	<ArrowUpDown className="size-3 opacity-40" />
																)}
															</button>
														) : (
															flexRender(header.column.columnDef.header, header.getContext())
														)}
													</th>
												);
											})}
										</tr>
									))}
								</thead>
								<tbody>
									{table.getRowModel().rows.map((row) => (
										<tr
											key={row.id}
											className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--link-bg-hover)]"
										>
											{row.getAllCells().map((cell) => (
												<td key={cell.id} className="px-4 py-3 align-middle">
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<ul className="m-0 grid list-none gap-3 p-0 md:hidden">
						{table.getRowModel().rows.map((row) => {
							const entry = row.original;
							const blockReason = deleteBlockReason(entry);
							return (
								<li key={row.id} className="island-shell rounded-2xl p-4">
									<div className="flex items-center gap-3">
										<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--chip-bg)] text-xs font-semibold text-[var(--sea-ink)]">
											{(entry.name?.charAt(0) || entry.email.charAt(0)).toUpperCase()}
										</span>
										<div className="min-w-0 flex-1">
											<p className="m-0 flex items-center gap-2 font-medium text-[var(--sea-ink)]">
												{entry.name ?? "Unnamed"}
												{entry.id === currentUser.id && (
													<span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--sea-ink-soft)]">
														You
													</span>
												)}
											</p>
											<p className="m-0 truncate text-xs text-[var(--sea-ink-soft)]">
												{entry.email}
											</p>
										</div>
										<span
											className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
												entry.role === "admin"
													? "bg-[var(--lagoon)]/20 text-[var(--lagoon-deep)]"
													: "bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]"
											}`}
										>
											{entry.role === "admin" && <ShieldCheck className="size-3" />}
											{roleLabel(entry.role)}
										</span>
									</div>
									<div className="mt-3 flex justify-end gap-1 border-t border-[var(--line)] pt-3">
										<Button variant="outline" size="sm" onClick={() => openRole(entry)}>
											<UserCog className="size-4" />
											Change role
										</Button>
										<Button
											variant="ghost"
											size="sm"
											title={blockReason ?? undefined}
											disabled={Boolean(blockReason)}
											className="text-destructive hover:text-destructive"
											onClick={() => {
												setDeleteError("");
												setPendingDelete(entry);
											}}
										>
											<Trash2 className="size-4" />
											Delete
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				</>
			)}

			<UserRoleModal
				open={Boolean(roleTarget)}
				onOpenChange={(next) => {
					if (!next) setRoleTarget(null);
				}}
				target={roleTarget}
				lockReason={roleTarget ? lockReasonFor(roleTarget) : null}
				onSaved={refresh}
			/>

			<ConfirmDialog
				open={Boolean(pendingDelete)}
				onOpenChange={(next) => {
					if (!next) setPendingDelete(null);
				}}
				title="Delete user"
				description={`This permanently removes ${pendingDelete?.email ?? "this account"} and revokes their sessions. This cannot be undone.`}
				confirmLabel="Delete user"
				loading={deleting}
				error={deleteError}
				onConfirm={confirmDelete}
			/>
		</div>
	);
}
