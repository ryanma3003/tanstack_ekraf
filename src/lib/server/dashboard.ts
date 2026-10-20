import { createServerFn } from "@tanstack/react-start";

import { countAdmins, db, getUserRole } from "@/lib/db";
import { requireAuth } from "@/lib/session";

/**
 * Lightweight dashboard metrics. Available to any signed-in user, but
 * administrative figures (user/admin counts) are only returned to admins so
 * that an ordinary user cannot enumerate accounts.
 */
export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
	const { user } = await requireAuth();
	const role = getUserRole(user.id);
	const isAdmin = role === "admin";

	return {
		role,
		displayName: user.name ?? user.email,
		email: user.email,
		productCount: db.product.length,
		userCount: isAdmin ? db.user.length : null,
		adminCount: isAdmin ? countAdmins() : null,
		lowStock: db.product.filter((product) => product.stock <= 3).length,
	};
});
