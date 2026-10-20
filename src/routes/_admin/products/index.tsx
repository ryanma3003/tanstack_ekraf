"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	createColumnHelper,
	createSortedRowModel,
	flexRender,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_text,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import {
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ImageOff,
	Package,
	Pencil,
	Plus,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useState } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import ProductFormModal from "@/components/products/ProductFormModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import type { Product } from "@/lib/db";
import { deleteProduct, getProducts } from "@/lib/server/products";

export const Route = createFileRoute("/_admin/products/")({
	head: () => ({ meta: [{ title: "Products · Ekraf Admin" }] }),
	component: ProductsPage,
});

const features = tableFeatures({
	rowSortingFeature,
	// Without `sortedRowModel` the sorting state is tracked but never applied to
	// the row model, so the header toggle appears to do nothing.
	sortedRowModel: createSortedRowModel(),
	sortFns: { text: sortFn_text, alphanumeric: sortFn_alphanumeric },
});
const columnHelper = createColumnHelper<typeof features, Product>();

function ProductsPage() {
	const { role } = useAuth();
	const isAdmin = role === "admin";
	const queryClient = useQueryClient();
	const deleteFn = useServerFn(deleteProduct);

	const productsQuery = useQuery({
		queryKey: ["products"],
		queryFn: async () => getProducts(),
	});

	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Product | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");

	const products = productsQuery.data ?? [];

	const refresh = async () => {
		await queryClient.invalidateQueries({ queryKey: ["products"] });
		await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
	};

	const openCreate = () => {
		setEditing(null);
		setFormOpen(true);
	};

	const openEdit = (product: Product) => {
		setEditing(product);
		setFormOpen(true);
	};

	const confirmDelete = async () => {
		if (!pendingDelete) return;
		setDeleting(true);
		setDeleteError("");
		try {
			await deleteFn({ data: { id: pendingDelete.id } });
			await refresh();
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(err instanceof Error ? err.message : "Could not delete this product.");
		} finally {
			setDeleting(false);
		}
	};

	const columns = columnHelper.columns([
		columnHelper.accessor("image", {
			header: "Image",
			enableSorting: false,
			cell: (info) => <ProductThumb product={info.row.original} />,
		}),
		columnHelper.accessor("name", {
			header: "Name",
			cell: (info) => <span className="font-medium text-[var(--sea-ink)]">{info.getValue()}</span>,
		}),
		columnHelper.accessor("description", {
			header: "Description",
			enableSorting: false,
			cell: (info) => (
				<span className="line-clamp-2 text-[var(--sea-ink-soft)]">{info.getValue()}</span>
			),
		}),
		columnHelper.accessor("price", {
			header: "Price",
			cell: (info) => (
				<span className="font-mono text-[var(--sea-ink)]">
					${Number(info.getValue()).toFixed(2)}
				</span>
			),
		}),
		columnHelper.accessor("stock", {
			header: "Stock",
			cell: (info) => <StockBadge stock={info.getValue()} />,
		}),
		...(isAdmin
			? [
					columnHelper.display({
						id: "actions",
						header: () => <span className="sr-only">Actions</span>,
						enableSorting: false,
						cell: (info) => {
							const product = info.row.original;
							return (
								<div className="flex items-center justify-end gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Edit ${product.name}`}
										onClick={() => openEdit(product)}
									>
										<Pencil className="size-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Delete ${product.name}`}
										className="text-destructive hover:text-destructive"
										onClick={() => {
											setDeleteError("");
											setPendingDelete(product);
										}}
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							);
						},
					}),
				]
			: []),
	]);

	const table = useTable({
		features,
		columns,
		data: products,
	});

	return (
		<div className="mx-auto max-w-6xl">
			<PageHeader
				kicker="Catalogue"
				title="Products"
				description={
					isAdmin
						? "Create, edit and delete catalogue items. Every write is validated and authorised on the server."
						: "Browse the catalogue. Administrator access is required to make changes."
				}
				actions={
					isAdmin ? (
						<Button onClick={openCreate}>
							<Plus className="size-4" />
							Add product
						</Button>
					) : null
				}
			/>

			{productsQuery.isError ? (
				<ErrorState
					message={(productsQuery.error as Error).message}
					onRetry={() => void productsQuery.refetch()}
				/>
			) : productsQuery.isPending ? (
				<TableSkeleton />
			) : products.length === 0 ? (
				<EmptyState
					isAdmin={isAdmin}
					onAdd={() => {
						openCreate();
					}}
				/>
			) : (
				<>
					{/* Desktop table */}
					<div className="island-shell hidden overflow-hidden rounded-2xl md:block">
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								<thead>
									{table.getHeaderGroups().map((headerGroup) => (
										<tr key={headerGroup.id} className="border-b border-[var(--line)]">
											{headerGroup.headers.map((header) => {
												const sorted = header.column.getIsSorted();
												return (
													<th
														key={header.id}
														colSpan={header.colSpan}
														aria-sort={
															!header.column.getCanSort()
																? undefined
																: sorted === "asc"
																	? "ascending"
																	: sorted === "desc"
																		? "descending"
																		: "none"
														}
														className="bg-[var(--chip-bg)] px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--sea-ink-soft)] uppercase"
													>
														{header.isPlaceholder ? null : header.column.getCanSort() ? (
															<button
																type="button"
																onClick={header.column.getToggleSortingHandler()}
																className="inline-flex items-center gap-1.5 font-semibold text-inherit uppercase transition hover:text-[var(--sea-ink)] focus-visible:ring-2 focus-visible:ring-[var(--lagoon-deep)] focus-visible:outline-none"
															>
																{flexRender(header.column.columnDef.header, header.getContext())}
																{sorted === "asc" ? (
																	<ArrowUp className="size-3 text-[var(--lagoon-deep)]" />
																) : sorted === "desc" ? (
																	<ArrowDown className="size-3 text-[var(--lagoon-deep)]" />
																) : (
																	<ArrowUpDown className="size-3 opacity-40" />
																)}
															</button>
														) : (
															flexRender(header.column.columnDef.header, header.getContext())
														)}
													</th>
												);
											})}
										</tr>
									))}
								</thead>
								<tbody>
									{table.getRowModel().rows.map((row) => (
										<tr
											key={row.id}
											className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--link-bg-hover)]"
										>
											{row.getAllCells().map((cell) => (
												<td key={cell.id} className="px-4 py-3 align-middle">
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Mobile cards */}
					<ul className="m-0 grid list-none gap-3 p-0 md:hidden">
						{table.getRowModel().rows.map((row) => {
							const product = row.original;
							return (
								<li key={row.id} className="island-shell rounded-2xl p-4">
									<div className="flex gap-3">
										<ProductThumb product={product} size="lg" />
										<div className="min-w-0 flex-1">
											<p className="m-0 font-semibold text-[var(--sea-ink)]">{product.name}</p>
											<p className="m-0 mt-0.5 line-clamp-2 text-sm text-[var(--sea-ink-soft)]">
												{product.description}
											</p>
											<div className="mt-2 flex flex-wrap items-center gap-3">
												<span className="font-mono text-sm text-[var(--sea-ink)]">
													${product.price.toFixed(2)}
												</span>
												<StockBadge stock={product.stock} />
											</div>
										</div>
									</div>
									{isAdmin && (
										<div className="mt-3 flex justify-end gap-1 border-t border-[var(--line)] pt-3">
											<Button variant="outline" size="sm" onClick={() => openEdit(product)}>
												<Pencil className="size-4" />
												Edit
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive hover:text-destructive"
												onClick={() => {
													setDeleteError("");
													setPendingDelete(product);
												}}
											>
												<Trash2 className="size-4" />
												Delete
											</Button>
										</div>
									)}
								</li>
							);
						})}
					</ul>
				</>
			)}

			{isAdmin && (
				<ProductFormModal
					open={formOpen}
					onOpenChange={setFormOpen}
					product={editing}
					onSaved={refresh}
				/>
			)}

			<ConfirmDialog
				open={Boolean(pendingDelete)}
				onOpenChange={(next) => {
					if (!next) setPendingDelete(null);
				}}
				title="Delete product"
				description={`This permanently removes "${pendingDelete?.name ?? ""}" from the catalogue. This cannot be undone.`}
				confirmLabel="Delete product"
				loading={deleting}
				error={deleteError}
				onConfirm={confirmDelete}
			/>
		</div>
	);
}

function ProductThumb({ product, size = "sm" }: { product: Product; size?: "sm" | "lg" }) {
	const dimension = size === "lg" ? "size-14" : "size-10";
	if (product.image) {
		return (
			<img
				src={product.image}
				alt={product.name}
				className={`${dimension} shrink-0 rounded-lg border border-[var(--line)] object-cover`}
			/>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={`${dimension} flex shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]`}
		>
			<ImageOff className="size-4" />
		</span>
	);
}

function StockBadge({ stock }: { stock: number }) {
	const tone =
		stock === 0
			? "bg-red-500/15 text-red-700 dark:text-red-400"
			: stock <= 3
				? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
				: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
		>
			{stock === 0 ? "Out of stock" : `${stock} in stock`}
		</span>
	);
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div className="island-shell rounded-2xl p-8 text-center">
			<AlertTriangle className="mx-auto mb-3 size-6 text-red-600" />
			<p className="m-0 text-sm text-[var(--sea-ink-soft)]">Could not load products: {message}</p>
			<Button variant="outline" className="mt-4" onClick={onRetry}>
				<RefreshCw className="size-4" />
				Retry
			</Button>
		</div>
	);
}

function EmptyState({ isAdmin, onAdd }: { isAdmin: boolean; onAdd: () => void }) {
	return (
		<div className="island-shell rounded-2xl p-10 text-center">
			<span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]">
				<Package className="size-6" />
			</span>
			<p className="m-0 font-semibold text-[var(--sea-ink)]">No products yet</p>
			<p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">
				{isAdmin
					? "Add your first product to start building the catalogue."
					: "The catalogue is empty. Check back later."}
			</p>
			{isAdmin && (
				<Button className="mt-4" onClick={onAdd}>
					<Plus className="size-4" />
					Add product
				</Button>
			)}
		</div>
	);
}

function TableSkeleton() {
	return (
		<div className="island-shell overflow-hidden rounded-2xl">
			<div className="border-b border-[var(--line)] bg-[var(--chip-bg)] px-4 py-3">
				<div className="h-3 w-40 animate-pulse rounded bg-[var(--line)]" />
			</div>
			{["a", "b", "c", "d"].map((key) => (
				<div
					key={key}
					className="flex items-center gap-4 border-b border-[var(--line)] px-4 py-4 last:border-0"
				>
					<div className="size-10 animate-pulse rounded-lg bg-[var(--chip-bg)]" />
					<div className="h-3 flex-1 animate-pulse rounded bg-[var(--chip-bg)]" />
					<div className="hidden h-3 w-24 animate-pulse rounded bg-[var(--chip-bg)] sm:block" />
					<div className="hidden h-3 w-16 animate-pulse rounded bg-[var(--chip-bg)] md:block" />
				</div>
			))}
		</div>
	);
}
