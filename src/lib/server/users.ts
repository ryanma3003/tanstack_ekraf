import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, getUserRole, removeUserRole, setUserRole } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const userRoleSchema = z.object({ userId: z.string().min(1), role: z.enum(["admin", "user"]) });
export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return db.user.map((user) => ({ id: user.id, email: user.email, name: user.name, role: getUserRole(user.id), emailVerified: !!user.emailVerified, createdAt: user.createdAt.toISOString() }));
});
export const updateUserRole = createServerFn({ method: "POST" }).validator(userRoleSchema).handler(async ({ data }) => {
  const { user: currentUser } = await requireAdmin();
  if (data.userId === currentUser.id && data.role !== "admin") { const err = new Error("You cannot remove your own administrator role.") as Error & { status?: number }; err.status = 400; throw err; }
  const target = db.user.find((user) => user.id === data.userId);
  if (!target) { const err = new Error("User not found.") as Error & { status?: number }; err.status = 404; throw err; }
  setUserRole(data.userId, data.role); return { ok: true };
});
export const deleteUser = createServerFn({ method: "POST" }).validator(z.object({ userId: z.string().min(1) })).handler(async ({ data }) => {
  const { user: currentUser } = await requireAdmin();
  if (data.userId === currentUser.id) { const err = new Error("You cannot delete your own account while signed in.") as Error & { status?: number }; err.status = 400; throw err; }
  const target = db.user.find((user) => user.id === data.userId);
  if (!target) { const err = new Error("User not found.") as Error & { status?: number }; err.status = 404; throw err; }
  if (getUserRole(data.userId) === "admin") {
    const adminCount = db.userRole.filter((role) => role.role === "admin" && db.user.some((user) => user.id === role.userId)).length;
    if (adminCount <= 1) { const err = new Error("Cannot delete the last administrator.") as Error & { status?: number }; err.status = 400; throw err; }
  }
  db.user = db.user.filter((user) => user.id !== data.userId);
  db.session = db.session.filter((session) => (session as { userId?: string }).userId !== data.userId);
  removeUserRole(data.userId); return { ok: true };
});
