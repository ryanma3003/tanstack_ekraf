import { memoryAdapter } from "better-auth/adapters/memory";
export type Role = "admin" | "user";
export interface Product { id: string; name: string; description: string; price: number; stock: number; imageUrl?: string; createdAt: string; updatedAt: string; }
export interface UserRole { userId: string; role: Role; }
/** In-memory development adapter. Records reset when the server process restarts. */
const memoryDb = {
  user: [] as Array<{ id: string; email: string; name: string | null; image: string | null; emailVerified: boolean; emailVerifiedAt: Date | null; createdAt: Date; updatedAt: Date; lastSignInAt: Date | null; }>,
  session: [] as unknown[], account: [] as unknown[], verification: [] as unknown[], product: [] as Product[], userRole: [] as UserRole[],
};
export const adapter = memoryAdapter(memoryDb);
export const db = memoryDb;
export const SEED_ADMIN_EMAIL = "admin@example.com";
export const SEED_ADMIN_PASSWORD = "admin12345";
export function getUserRole(userId: string): Role { return db.userRole.find((r) => r.userId === userId)?.role ?? "user"; }
export function setUserRole(userId: string, role: Role) { const existing = db.userRole.find((r) => r.userId === userId); if (existing) existing.role = role; else db.userRole.push({ userId, role }); }
export function removeUserRole(userId: string) { db.userRole = db.userRole.filter((r) => r.userId !== userId); }
