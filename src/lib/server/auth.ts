import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
	SEED_ADMIN_EMAIL,
	SEED_ADMIN_PASSWORD,
	db,
	getUserRole,
	logAudit,
	setUserRole,
} from "@/lib/db";
import { getCurrentSession } from "@/lib/session";

/**
 * Server-only session lookup. Safe to call from TanStack Router `beforeLoad`
 * (which runs on the client during client navigation) because server
 * functions always execute on the server.
 */
export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
	return getCurrentSession();
});

/**
 * One-time development seed: creates the administrator account (password
 * hashed by Better Auth) and seeds sample products.
 *
 * Idempotent and crash-safe: if an administrator already exists it returns
 * early, and if the seed email already exists as a normal user it is promoted
 * instead of attempting a duplicate sign-up.
 *
 * Called from the client via `useServerFn(seedAdmin)` on the /setup page.
 */
export const seedAdmin = createServerFn({ method: "POST" })
	.validator(z.object({}).optional())
	.handler(async () => {
		const hasAdmin = db.user.some((u) => getUserRole(u.id) === "admin");
		if (hasAdmin) {
			return { ok: true, alreadySeeded: true, admin: SEED_ADMIN_EMAIL };
		}

		let adminUser = db.user.find((u) => u.email === SEED_ADMIN_EMAIL);
		if (!adminUser) {
			try {
				await auth.api.signUpEmail({
					body: {
						email: SEED_ADMIN_EMAIL,
						password: SEED_ADMIN_PASSWORD,
						name: "Administrator",
					},
					headers: new Headers(),
				});
			} catch {
				// A concurrent seed may have created the account already; fall
				// through and reuse whatever user now owns the seed email.
			}
			adminUser = db.user.find((u) => u.email === SEED_ADMIN_EMAIL);
		}

		if (!adminUser) {
			throw new Error("Failed to create the seed administrator account");
		}

		setUserRole(adminUser.id, "admin");

		if (db.product.length === 0) {
			const now = new Date().toISOString();
			const products = [
				{
					name: "Starter Kit",
					description: "Everything you need to begin.",
					price: 49,
					stock: 12,
				},
				{
					name: "Pro Plan",
					description: "For growing teams.",
					price: 149,
					stock: 5,
				},
				{
					name: "Enterprise",
					description: "Self-hosted, full support.",
					price: 499,
					stock: 1,
				},
			].map((p) => ({
				id: crypto.randomUUID(),
				...p,
				image: null,
				createdAt: now,
				updatedAt: now,
			}));
			db.product.push(...products);
		}

		logAudit({
			actorId: adminUser.id,
			actorEmail: adminUser.email,
			action: "setup.seed",
			target: adminUser.id,
			detail: "Seeded administrator account and sample products",
		});

		return { ok: true, alreadySeeded: false, admin: SEED_ADMIN_EMAIL };
	});
