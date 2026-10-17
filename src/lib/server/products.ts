import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type Product, db } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";

const imageUrlSchema = z.string().trim().max(2048, "Image URL is too long.").refine((value) => {
  if (!value) return true;
  try { const parsed = new URL(value); return parsed.protocol === "https:" || parsed.protocol === "http:"; }
  catch { return false; }
}, "Image must be a valid HTTP(S) URL.");

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120, "Name must be 120 characters or fewer."),
  description: z.string().trim().min(1, "Description is required.").max(2000, "Description must be 2000 characters or fewer."),
  price: z.coerce.number().finite().min(0, "Price cannot be negative.").max(1_000_000_000, "Price is too large."),
  stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer.").max(1_000_000_000, "Stock is too large."),
  imageUrl: imageUrlSchema.optional().default(""),
});
export type ProductInput = z.infer<typeof productSchema>;
export const getProducts = createServerFn({ method: "GET" }).handler(async () => { await requireAuth(); return [...db.product].sort((a,b) => b.createdAt.localeCompare(a.createdAt)) as Product[]; });
export const createProduct = createServerFn({ method: "POST" }).validator(productSchema).handler(async ({ data }) => {
  await requireAdmin(); const now = new Date().toISOString();
  const product = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now } as Product; db.product.push(product); return product;
});
export const updateProduct = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().min(1), ...productSchema.shape })).handler(async ({ data }) => {
  await requireAdmin(); const index = db.product.findIndex((product) => product.id === data.id);
  if (index === -1) { const err = new Error("Product not found.") as Error & { status?: number }; err.status = 404; throw err; }
  const updated = { ...db.product[index], ...data, updatedAt: new Date().toISOString() } as Product; db.product[index] = updated; return updated;
});
export const deleteProduct = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().min(1) })).handler(async ({ data }) => {
  await requireAdmin(); const index = db.product.findIndex((product) => product.id === data.id);
  if (index === -1) { const err = new Error("Product not found.") as Error & { status?: number }; err.status = 404; throw err; }
  db.product.splice(index, 1); return { ok: true };
});
