import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { type Product, db, logAudit } from "@/lib/db";
import { MAX_IMAGE_CHARS, validateImageValue } from "@/lib/image";
import { sanitizeText } from "@/lib/sanitize";
import { requireAdmin, requireAuth } from "@/lib/session";

const nameSchema = z
	.string()
	.trim()
	.min(1, "Name is required")
	.max(120, "Name must be 120 characters or fewer")
	.transform(sanitizeText)
	.refine((value) => value.length > 0, "Name is required");

const descriptionSchema = z
	.string()
	.trim()
	.min(1, "Description is required")
	.max(600, "Description must be 600 characters or fewer")
	.transform(sanitizeText)
	.refine((value) => value.length > 0, "Description is required");

const priceSchema = z.coerce
	.number()
	.min(0, "Price must be 0 or greater")
	.max(1_000_000, "Price is unreasonably large");

const stockSchema = z.coerce
	.number()
	.int("Stock must be a whole number")
	.min(0, "Stock must be 0 or greater")
	.max(1_000_000, "Stock is unreasonably large");

const imageSchema = z
	.string()
	.max(MAX_IMAGE_CHARS, "Image is too large to store inline")
	.optional()
	.default("")
	.transform((value) => value.trim())
	.refine((value) => value === "" || validateImageValue(value).ok, {
		message:
			"Image must be an http(s) URL or a PNG/JPEG/WebP/GIF under 512 KB and at most 512×512px",
	})
	.transform((value) => (value === "" ? null : value));

export const productSchema = z.object({
	name: nameSchema,
	description: descriptionSchema,
	price: priceSchema,
	stock: stockSchema,
	image: imageSchema,
});

export type ProductInput = z.infer<typeof productSchema>;

// TanStack Start server functions support GET and POST only. Mutations use
// POST and encode the intended action in the validator/body.
export const getProducts = createServerFn({ method: "GET" }).handler(async () => {
	await requireAuth();
	return [...db.product].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as Product[];
});

export const createProduct = createServerFn({ method: "POST" })
	.validator(productSchema)
	.handler(async ({ data }) => {
		const { user } = await requireAdmin();
		const now = new Date().toISOString();
		const product: Product = {
			id: crypto.randomUUID(),
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			image: data.image ?? null,
			createdAt: now,
			updatedAt: now,
		};
		db.product.push(product);
		logAudit({
			actorId: user.id,
			actorEmail: user.email,
			action: "product.create",
			target: product.id,
			detail: product.name,
		});
		return product;
	});

export const updateProduct = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string().min(1), ...productSchema.shape }))
	.handler(async ({ data }) => {
		const { user } = await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) {
			const err = new Error("Product not found") as Error & { status?: number };
			err.status = 404;
			throw err;
		}
		const now = new Date().toISOString();
		const updated: Product = {
			...db.product[index],
			name: data.name,
			description: data.description,
			price: data.price,
			stock: data.stock,
			image: data.image ?? null,
			updatedAt: now,
		};
		db.product[index] = updated;
		logAudit({
			actorId: user.id,
			actorEmail: user.email,
			action: "product.update",
			target: updated.id,
			detail: updated.name,
		});
		return updated;
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const { user } = await requireAdmin();
		const index = db.product.findIndex((p) => p.id === data.id);
		if (index === -1) {
			const err = new Error("Product not found") as Error & { status?: number };
			err.status = 404;
			throw err;
		}
		const [removed] = db.product.splice(index, 1);
		logAudit({
			actorId: user.id,
			actorEmail: user.email,
			action: "product.delete",
			target: data.id,
			detail: removed?.name ?? null,
		});
		return { ok: true };
	});
