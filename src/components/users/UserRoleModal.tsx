"use client";

import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/db";
import { updateUserRole } from "@/lib/server/users";

interface RoleTarget {
	id: string;
	email: string;
	role: Role;
}

interface UserRoleModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	target: RoleTarget | null;
	/** When set, role changes are blocked (e.g. editing yourself or the last admin). */
	lockReason?: string | null;
	onSaved: () => void | Promise<void>;
}

export default function UserRoleModal({
	open,
	onOpenChange,
	target,
	lockReason = null,
	onSaved,
}: UserRoleModalProps) {
	const [submitting, setSubmitting] = useState(false);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!submitting) onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Change role</DialogTitle>
					<DialogDescription>
						Update the access level for <span className="font-medium">{target?.email}</span>.
					</DialogDescription>
				</DialogHeader>
				{open && target && (
					<RoleForm
						key={target.id}
						target={target}
						lockReason={lockReason}
						onCancel={() => onOpenChange(false)}
						onSaved={onSaved}
						onSubmittingChange={setSubmitting}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function RoleForm({
	target,
	lockReason,
	onCancel,
	onSaved,
	onSubmittingChange,
}: {
	target: RoleTarget;
	lockReason: string | null;
	onCancel: () => void;
	onSaved: () => void | Promise<void>;
	onSubmittingChange: (submitting: boolean) => void;
}) {
	const updateRoleFn = useServerFn(updateUserRole);
	const [role, setRole] = useState<Role>(target.role);
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const locked = Boolean(lockReason);
	const unchanged = role === target.role;

	const handleSave = async () => {
		setError("");
		setSubmitting(true);
		onSubmittingChange(true);
		try {
			await updateRoleFn({ data: { userId: target.id, role } });
			await onSaved();
			onCancel();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not update the role.");
		} finally {
			setSubmitting(false);
			onSubmittingChange(false);
		}
	};

	return (
		<div className="space-y-4">
			{locked && (
				<p className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
					<ShieldAlert className="mt-0.5 size-4 shrink-0" />
					<span>{lockReason}</span>
				</p>
			)}

			{error && (
				<p
					role="alert"
					className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					{error}
				</p>
			)}

			<div className="space-y-1.5">
				<Label htmlFor="role-select">Role</Label>
				<Select value={role} onValueChange={(next) => setRole(next as Role)} disabled={locked}>
					<SelectTrigger id="role-select" className="w-full">
						<SelectValue placeholder="Select a role" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="user">User — read-only product access</SelectItem>
						<SelectItem value="admin">Administrator — full access</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<DialogFooter className="pt-2">
				<Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
					Cancel
				</Button>
				<Button
					type="button"
					onClick={() => void handleSave()}
					disabled={locked || unchanged || submitting}
				>
					{submitting && <Loader2 className="size-4 animate-spin" />}
					{submitting ? "Saving..." : "Save role"}
				</Button>
			</DialogFooter>
		</div>
	);
}
