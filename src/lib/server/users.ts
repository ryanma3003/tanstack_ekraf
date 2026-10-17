import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { countAdmins, db, getUserRole, logAudit, removeUserRole, setUserRole } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const userRoleSchema = z.object({
	userId: z.string().min(1),
	role: z.enum(["admin", "user"]),
});

function httpError(message: string, status: number) {
	return Object.assign(new Error(message), { status });
}

export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
	await requireAdmin();
	return db.user.map((u) => ({
		id: u.id,
		email: u.email,
		name: u.name,
		role: getUserRole(u.id),
		emailVerified: !!u.emailVerified,
		createdAt: new Date(u.createdAt).toISOString(),
	}));
});

export const updateUserRole = createServerFn({ method: "POST" })
	.validator(userRoleSchema)
	.handler(async ({ data }) => {
		const { user } = await requireAdmin();

		// An admin cannot demote themselves, otherwise the current session would
		// silently keep admin UI access while the server rejects every write.
		if (data.userId === user.id && data.role !== "admin") {
			throw httpError("You cannot remove your own administrator role", 400);
		}

		const target = db.user.find((u) => u.id === data.userId);
		if (!target) {
			throw httpError("User not found", 404);
		}

		// Never allow the last administrator to be demoted.
		if (getUserRole(data.userId) === "admin" && data.role !== "admin" && countAdmins() <= 1) {
			throw httpError("Cannot demote the last administrator", 400);
		}

		setUserRole(data.userId, data.role);
		logAudit({
			actorId: user.id,
			actorEmail: user.email,
			action: "user.role.update",
			target: data.userId,
			detail: `${target.email} -> ${data.role}`,
		});
		return { ok: true };
	});

export const deleteUser = createServerFn({ method: "POST" })
	.validator(z.object({ userId: z.string().min(1) }))
	.handler(async ({ data }) => {
		const { user } = await requireAdmin();

		if (data.userId === user.id) {
			throw httpError("You cannot delete your own account", 400);
		}

		const target = db.user.find((u) => u.id === data.userId);
		if (!target) {
			throw httpError("User not found", 404);
		}

		// Prevent removing the last administrator so the app never locks itself out.
		if (getUserRole(data.userId) === "admin" && countAdmins() <= 1) {
			throw httpError("Cannot delete the last administrator", 400);
		}

		// Also remove any sessions owned by the deleted user.
		db.session = (db.session as Array<{ userId?: string }>).filter(
			(session) => session.userId !== data.userId,
		);
		db.user = db.user.filter((u) => u.id !== data.userId);
		removeUserRole(data.userId);
		logAudit({
			actorId: user.id,
			actorEmail: user.email,
			action: "user.delete",
			target: data.userId,
			detail: target.email,
		});
		return { ok: true };
	});
