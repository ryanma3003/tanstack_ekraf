import { memoryAdapter } from "better-auth/adapters/memory";

export type Role = "admin" | "user";

export interface Product {
	id: string;
	name: string;
	description: string;
	price: number;
	stock: number;
	/** Optional image as an `https://` URL or a `data:image/...;base64,...` string. */
	image: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface UserRole {
	userId: string;
	role: Role;
}

export interface AuditEntry {
	id: string;
	at: string;
	actorId: string;
	actorEmail: string;
	action: string;
	target: string | null;
	detail: string | null;
}

/**
 * In-memory development database.
 *
 * better-auth owns the `user`, `session`, `account` and `verification` tables
 * (managed through `memoryAdapter`). This app adds `product`, `userRole` and
 * `auditLog`.
 *
 * NOTE: this is memory only. Data survives within a single running server
 * process (local dev, or one warmed Vercel serverless instance) but is reset
 * on every redeploy / cold start. There is no persistent database by design.
 * See AGENTS.md for how to seed an admin account and sample data.
 */
const memoryDb = {
	user: [] as Array<{
		id: string;
		email: string;
		name: string | null;
		image: string | null;
		emailVerified: boolean;
		emailVerifiedAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
		lastSignInAt: Date | null;
	}>,
	session: [] as unknown[],
	account: [] as unknown[],
	verification: [] as unknown[],
	product: [] as Product[],
	userRole: [] as UserRole[],
	auditLog: [] as AuditEntry[],
};

export const adapter = memoryAdapter(memoryDb);
export const db = memoryDb;

/**
 * Seed credentials are read from the environment so no secret lives in source.
 * The development defaults keep the local `/setup` flow frictionless; override
 * `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env.local` (or Vercel) for
 * anything that is not a throwaway local instance.
 */
export const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
export const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin12345";

/** Maximum number of audit entries retained in memory. */
const AUDIT_LOG_LIMIT = 200;

export function getUserRole(userId: string): Role {
	return db.userRole.find((r) => r.userId === userId)?.role ?? "user";
}

export function setUserRole(userId: string, role: Role) {
	const existing = db.userRole.find((r) => r.userId === userId);
	if (existing) {
		existing.role = role;
	} else {
		db.userRole.push({ userId, role });
	}
}

export function removeUserRole(userId: string) {
	db.userRole = db.userRole.filter((r) => r.userId !== userId);
}

export function countAdmins(): number {
	return db.userRole.filter((r) => r.role === "admin").length;
}

/**
 * Append an administrator action to the in-memory audit trail. This is a
 * best-effort security control: it records *who* did *what* and *when* so
 * suspicious admin activity can be reviewed. It never throws.
 */
export function logAudit(entry: {
	actorId: string;
	actorEmail: string;
	action: string;
	target?: string | null;
	detail?: string | null;
}) {
	try {
		db.auditLog.push({
			id: crypto.randomUUID(),
			at: new Date().toISOString(),
			actorId: entry.actorId,
			actorEmail: entry.actorEmail,
			action: entry.action,
			target: entry.target ?? null,
			detail: entry.detail ?? null,
		});
		if (db.auditLog.length > AUDIT_LOG_LIMIT) {
			db.auditLog.splice(0, db.auditLog.length - AUDIT_LOG_LIMIT);
		}
	} catch {
		// Auditing must never break the primary operation.
	}
}
