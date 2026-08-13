"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Category, Concern, Product } from "@/lib/types";
import AdminTable, { type Column, type SortState } from "@/components/ui/AdminTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProductFiltersModal, { type ProductFilters } from "@/components/ui/ProductFiltersModal";

const PLACEHOLDER = "/placeholder.svg";
const EMPTY_FILTERS: ProductFilters = { categorySlug: null, concernSlug: null };

export default function ProductsPage() {
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS);
  // Price/Stock column sort — a click picks that column ascending; clicking
  // the same column again flips direction. `key` matches the column's
  // sortKey ("price" / "stock"), combined with direction into the backend's
  // "price_asc" / "stock_desc" etc. sort values.
  const [sort, setSort] = useState<SortState | null>(null);
  // fetchPage is a stable useCallback (AdminTable only re-runs it on
  // reloadKey/q changes), so the active filters/sort are read from refs
  // rather than the closed-over state — same pattern as the orders status tabs.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const sortRef = useRef(sort);
  sortRef.current = sort;

  useEffect(() => {
    api.get<Category[]>("/categories").then((r) => setCategories(r.data)).catch(() => setCategories([]));
    api.get<Concern[]>("/concerns").then((r) => setConcerns(r.data)).catch(() => setConcerns([]));
  }, []);

  const applyFilters = (next: ProductFilters) => {
    setFilters(next);
    setReloadKey((k) => k + 1);
  };

  const toggleSort = (key: string) => {
    setSort((prev) => (prev?.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));
    setReloadKey((k) => k + 1);
  };

  const activeFilterCount = Number(Boolean(filters.categorySlug)) + Number(Boolean(filters.concernSlug));

  // Display names for the active filter chips — category can be a top-level
  // or a subcategory, so check children too; fall back to the slug itself if
  // the lists haven't loaded yet.
  const categoryName = (slug: string) => {
    for (const cat of categories) {
      if (cat.slug === slug) return cat.name;
      const sub = cat.children?.find((ch) => ch.slug === slug);
      if (sub) return sub.name;
    }
    return slug;
  };
  const concernName = (slug: string) => concerns.find((c) => c.slug === slug)?.title ?? slug;

  const filterSummary =
    activeFilterCount > 0 ? (
      <div className="flex flex-wrap items-center gap-2">
        {filters.categorySlug && (
          <FilterChip
            label={categoryName(filters.categorySlug)}
            onRemove={() => applyFilters({ ...filters, categorySlug: null })}
          />
        )}
        {filters.concernSlug && (
          <FilterChip
            label={concernName(filters.concernSlug)}
            onRemove={() => applyFilters({ ...filters, concernSlug: null })}
          />
        )}
        <button
          type="button"
          onClick={() => applyFilters(EMPTY_FILTERS)}
          className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted hover:border-primary hover:text-primary transition-colors"
        >
          Clear all
        </button>
      </div>
    ) : null;

  const fetchPage = useCallback(async ({ q, page }: { q: string; page: number }) => {
    const params = new URLSearchParams({ page: String(page), limit: "16" });
    if (q) params.set("q", q);
    if (filtersRef.current.categorySlug) params.set("categorySlug", filtersRef.current.categorySlug);
    if (filtersRef.current.concernSlug) params.set("concernSlug", filtersRef.current.concernSlug);
    if (sortRef.current) params.set("sort", `${sortRef.current.key}_${sortRef.current.direction}`);
    const res = await api.get<Product[]>(`/products?${params.toString()}`);
    return {
      rows: res.data,
      hasMore: res.meta?.pagination.hasMore ?? false,
      total: res.meta?.pagination.total,
    };
  }, []);

  const columns: Column<Product>[] = [
    {
      header: "Product",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface">
            <Image src={p.mainImage?.imageUrl ?? PLACEHOLDER} alt="" fill sizes="44px" className="object-cover" />
          </span>
          <Link
            href={`/products/${p.id}/edit`}
            className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
          >
            {p.title}
          </Link>
        </div>
      ),
    },
    {
      header: "Price",
      sortKey: "price",
      cell: (p) => (
        <span>
          {formatPrice(p.discountPrice ?? p.basePrice)}
          {p.discountPrice && <s className="ml-1 text-xs text-muted">{formatPrice(p.basePrice)}</s>}
        </span>
      ),
    },
    {
      header: "Stock",
      sortKey: "stock",
      cell: (p) => <span className={p.stock === 0 ? "text-red-600" : ""}>{p.stock}</span>,
    },
    {
      header: "Status",
      cell: (p) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-surface text-muted"}`}>
          {p.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/products/new" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
          + New Product
        </Link>
      </div>

      <AdminTable
        columns={columns}
        fetchPage={fetchPage}
        getRowKey={(p) => p.id}
        searchPlaceholder="Search products by title…"
        itemLabel="products"
        reloadKey={reloadKey}
        onDelete={(p) => setToDelete(p)}
        activeSort={sort}
        onSortChange={toggleSort}
        filterSummary={filterSummary}
        toolbarExtra={
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5h16M7 12h10M10 19h4" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        }
      />

      <ProductFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        categories={categories}
        concerns={concerns}
        filters={filters}
        onChange={applyFilters}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete product"
        message={`Delete "${toDelete?.title}"? This cannot be undone.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/products/${toDelete.id}`);
            setReloadKey((k) => k + 1);
          }
        }}
      />
    </div>
  );
}

/** Active-filter pill with an × to remove just that one filter. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-white transition-colors"
    >
      {label}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
