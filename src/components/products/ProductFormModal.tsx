"use client";

import { useForm } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/db";
import {
	MAX_IMAGE_BYTES,
	MAX_IMAGE_DIMENSION,
	base64ToBytes,
	parseDataUrl,
	validateImageValue,
} from "@/lib/image";
import { createProduct, updateProduct } from "@/lib/server/products";

interface ProductFormModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product?: Product | null;
	onSaved: () => void | Promise<void>;
}

type ProductFormValues = {
	name: string;
	description: string;
	price: string;
	stock: string;
	image: string;
};

/** Normalise a TanStack Form error entry (string or `{ message }`) to text. */
function errorText(error: unknown): string {
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && "message" in error) {
		return String((error as { message?: unknown }).message ?? "");
	}
	return "";
}

export default function ProductFormModal({
	open,
	onOpenChange,
	product = null,
	onSaved,
}: ProductFormModalProps) {
	const [submitting, setSubmitting] = useState(false);
	const isEdit = Boolean(product);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!submitting) onOpenChange(next);
			}}
		>
			{/* `key` forces a fresh form (and fresh default values) each time the
			    dialog opens for a different product. */}
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Update the product details and save your changes."
							: "Add a product to the catalogue. Fields marked with * are required."}
					</DialogDescription>
				</DialogHeader>
				{open && (
					<ProductForm
						key={product?.id ?? "new"}
						product={product}
						onCancel={() => onOpenChange(false)}
						onSaved={onSaved}
						onSubmittingChange={setSubmitting}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ProductForm({
	product,
	onCancel,
	onSaved,
	onSubmittingChange,
}: {
	product: Product | null;
	onCancel: () => void;
	onSaved: () => void | Promise<void>;
	onSubmittingChange: (submitting: boolean) => void;
}) {
	const createFn = useServerFn(createProduct);
	const updateFn = useServerFn(updateProduct);
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const isEdit = Boolean(product);

	const form = useForm({
		defaultValues: {
			name: product?.name ?? "",
			description: product?.description ?? "",
			price: product ? String(product.price) : "",
			stock: product ? String(product.stock) : "",
			image: product?.image ?? "",
		} as ProductFormValues,
		onSubmit: async ({ value }) => {
			setError("");
			setSubmitting(true);
			onSubmittingChange(true);
			try {
				const payload = {
					name: value.name,
					description: value.description,
					price: Number(value.price),
					stock: Number(value.stock),
					image: value.image.trim(),
				};
				if (isEdit && product) {
					await updateFn({ data: { id: product.id, ...payload } });
				} else {
					await createFn({ data: payload });
				}
				await onSaved();
				onCancel();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
			} finally {
				setSubmitting(false);
				onSubmittingChange(false);
			}
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-4"
		>
			{error && (
				<p
					role="alert"
					className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					{error}
				</p>
			)}

			<form.Field
				name="name"
				validators={{
					onChange: ({ value }) =>
						!value.trim()
							? "Name is required"
							: value.trim().length > 120
								? "Name must be 120 characters or fewer"
								: undefined,
				}}
			>
				{(field) => (
					<div className="space-y-1.5">
						<Label htmlFor="product-name">Name *</Label>
						<Input
							id="product-name"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="e.g. Starter Kit"
							autoComplete="off"
							aria-invalid={field.state.meta.errors.length > 0}
						/>
						<FieldError errors={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			<form.Field
				name="description"
				validators={{
					onChange: ({ value }) =>
						!value.trim()
							? "Description is required"
							: value.trim().length > 600
								? "Description must be 600 characters or fewer"
								: undefined,
				}}
			>
				{(field) => (
					<div className="space-y-1.5">
						<Label htmlFor="product-description">Description *</Label>
						<Textarea
							id="product-description"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="What is this product about?"
							rows={3}
							aria-invalid={field.state.meta.errors.length > 0}
						/>
						<FieldError errors={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field
					name="price"
					validators={{
						onChange: ({ value }) => {
							if (value.trim() === "") return "Price is required";
							const price = Number(value);
							if (!Number.isFinite(price)) return "Enter a valid number";
							if (price < 0) return "Price must be 0 or greater";
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-1.5">
							<Label htmlFor="product-price">Price (USD) *</Label>
							<Input
								id="product-price"
								type="number"
								min="0"
								step="0.01"
								inputMode="decimal"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								placeholder="0.00"
								aria-invalid={field.state.meta.errors.length > 0}
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>

				<form.Field
					name="stock"
					validators={{
						onChange: ({ value }) => {
							if (value.trim() === "") return "Stock is required";
							const stock = Number(value);
							if (!Number.isFinite(stock)) return "Enter a valid number";
							if (!Number.isInteger(stock)) return "Stock must be a whole number";
							if (stock < 0) return "Stock must be 0 or greater";
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-1.5">
							<Label htmlFor="product-stock">Stock *</Label>
							<Input
								id="product-stock"
								type="number"
								min="0"
								step="1"
								inputMode="numeric"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								placeholder="0"
								aria-invalid={field.state.meta.errors.length > 0}
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>
			</div>

			<form.Field
				name="image"
				validators={{
					onChange: ({ value }) => {
						const result = validateImageValue(value);
						return result.ok ? undefined : result.error;
					},
				}}
			>
				{(field) => (
					<ImageField
						value={field.state.value}
						onChange={(next) => field.handleChange(next)}
						errors={field.state.meta.errors}
					/>
				)}
			</form.Field>

			<DialogFooter className="pt-2">
				<Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={submitting}>
					{submitting && <Loader2 className="size-4 animate-spin" />}
					{submitting ? "Saving..." : isEdit ? "Save changes" : "Create product"}
				</Button>
			</DialogFooter>
		</form>
	);
}

function FieldError({ errors }: { errors: unknown[] }) {
	const messages = errors.map(errorText).filter(Boolean);
	if (messages.length === 0) return null;
	return <p className="text-xs font-medium text-destructive">{messages.join(", ")}</p>;
}

function ImageField({
	value,
	onChange,
	errors,
}: {
	value: string;
	onChange: (value: string) => void;
	errors: unknown[];
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [localError, setLocalError] = useState("");
	const [resizing, setResizing] = useState(false);
	const [notice, setNotice] = useState("");
	const validation = validateImageValue(value);
	const canPreview = value.trim() !== "" && validation.ok;

	const handleFile = async (file: File | undefined) => {
		if (!file) return;
		setLocalError("");
		setNotice("");
		if (!file.type.startsWith("image/")) {
			setLocalError("Please choose an image file (PNG, JPEG, WebP or GIF).");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			setLocalError("Image must be smaller than 5 MB.");
			return;
		}
		setResizing(true);
		try {
			const { dataUrl, resized } = await downscaleImageFile(file);
			onChange(dataUrl);
			setNotice(
				resized
					? `Resized to fit within ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}px.`
					: "Image ready to save.",
			);
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : "Could not process that image.");
		} finally {
			setResizing(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	return (
		<div className="space-y-2">
			<Label htmlFor="product-image">Product image</Label>
			<div className="flex flex-col gap-3 sm:flex-row">
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
					aria-label="Upload product image"
				>
					{canPreview ? (
						<img src={value} alt="Product preview" className="h-full w-full object-contain" />
					) : (
						<span className="flex flex-col items-center gap-1 text-xs">
							{resizing ? (
								<Loader2 className="size-5 animate-spin" />
							) : (
								<ImagePlus className="size-5" />
							)}
							{resizing ? "Processing..." : "Upload"}
						</span>
					)}
				</button>

				<div className="flex-1 space-y-1.5">
					<Input
						id="product-image"
						value={value.startsWith("data:") ? "" : value}
						onChange={(event) => {
							setNotice("");
							onChange(event.target.value);
						}}
						placeholder="Paste an image URL, or upload a file"
						autoComplete="off"
						aria-invalid={errors.length > 0}
					/>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
							disabled={resizing}
						>
							Choose file
						</Button>
						{value.trim() !== "" && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									onChange("");
									setNotice("");
									setLocalError("");
								}}
							>
								<X className="size-3.5" />
								Remove
							</Button>
						)}
						{value.startsWith("data:") && (
							<span className="text-xs text-[var(--sea-ink-soft)]">Uploaded image</span>
						)}
					</div>
					<p className="text-xs text-[var(--sea-ink-soft)]">
						Max {MAX_IMAGE_DIMENSION}×{MAX_IMAGE_DIMENSION}px and 512 KB. Larger images are
						downscaled automatically.
					</p>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/png,image/jpeg,image/webp,image/gif"
						className="hidden"
						onChange={(event) => void handleFile(event.target.files?.[0])}
					/>
				</div>
			</div>
			{notice && <p className="text-xs font-medium text-emerald-600">{notice}</p>}
			{localError && <p className="text-xs font-medium text-destructive">{localError}</p>}
			<FieldError errors={errors} />
		</div>
	);
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("That file is not a valid image."));
		image.src = src;
	});
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error("Could not read that file."));
		reader.readAsDataURL(file);
	});
}

function estimateBytes(dataUrl: string): number {
	const parsed = parseDataUrl(dataUrl);
	if (!parsed) return 0;
	try {
		return base64ToBytes(parsed.base64).byteLength;
	} catch {
		return Number.POSITIVE_INFINITY;
	}
}

/**
 * Read an image file and guarantee the result is at most `MAX_IMAGE_DIMENSION`
 * pixels on its longest side. Images that are already small enough (and under
 * the byte budget) are kept untouched; everything else is redrawn on a canvas
 * and re-encoded as JPEG.
 */
async function downscaleImageFile(file: File): Promise<{ dataUrl: string; resized: boolean }> {
	const original = await readFileAsDataUrl(file);
	const image = await loadImage(original);
	const { width, height } = image;

	const withinDimensions = width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION;
	const withinBytes = estimateBytes(original) <= MAX_IMAGE_BYTES;
	if (withinDimensions && withinBytes) {
		return { dataUrl: original, resized: false };
	}

	const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
	const targetWidth = Math.max(1, Math.round(width * scale));
	const targetHeight = Math.max(1, Math.round(height * scale));

	const canvas = document.createElement("canvas");
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Your browser does not support image resizing.");
	context.drawImage(image, 0, 0, targetWidth, targetHeight);

	const keepPng =
		file.type === "image/png" && width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION;
	const dataUrl = keepPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);

	if (estimateBytes(dataUrl) > MAX_IMAGE_BYTES) {
		throw new Error("Image is still too large after resizing. Please pick a smaller file.");
	}

	return { dataUrl, resized: true };
}
