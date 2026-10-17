import { createServerFn } from "@tanstack/react-start";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

/**
 * Most recent administrator actions. Admin-only so the audit trail itself is
 * not an information leak.
 */
export const getAuditLog = createServerFn({ method: "GET" }).handler(async () => {
	await requireAdmin();
	return [...db.auditLog].reverse().slice(0, 15);
});
