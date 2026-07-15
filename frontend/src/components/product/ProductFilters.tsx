"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Concern } from "@/types";

export interface ActiveFilters {
  category?: string;
  concern?: string;
  minPrice?: string;
  maxPrice?: string;
  // Free-text search term (from the header search bar → /products?q=…). Not a
  // sidebar control, but carried through so applying a filter keeps the search.
  q?: string;
}

/**
 * Filter controls (category, concern, price range). Shared by the desktop
 * sidebar and the mobile slide-over. Selections apply IMMEDIATELY — picking a
 * category/concern writes it to the URL and re-fetches (no "Apply" button);
 * price applies on blur/Enter. Each group is a collapsible accordion.
 * "Clear all" resets to /products. `onDone` closes the mobile panel.
 */
export default function ProductFilters({
  categories,
  concerns,
  current,
  onDone,
}: {
  categories: Category[];
  concerns: Concern[];
  current: ActiveFilters;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [minPrice, setMinPrice] = useState(current.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(current.maxPrice ?? "");

  // Merge a change into the current filters and push to the URL (server refetch).
  const push = (next: Partial<ActiveFilters>, close = false) => {
    const merged = { ...current, ...next };
    const qs = new URLSearchParams();
    if (merged.q) qs.set("q", merged.q);
    if (merged.category) qs.set("category", merged.category);
    if (merged.concern) qs.set("concern", merged.concern);
    if (merged.minPrice) qs.set("minPrice", String(merged.minPrice));
    if (merged.maxPrice) qs.set("maxPrice", String(merged.maxPrice));
    router.push(qs.size > 0 ? `/products?${qs.toString()}` : "/products");
    if (close) onDone?.();
  };

  const clearAll = () => {
    setMinPrice("");
    setMaxPrice("");
    router.push("/products");
    onDone?.();
  };

  const priceInput =
    "w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition";

  return (
    <div className="space-y-3">
      <FilterGroup label="Category">
        <RadioRow label="All categories" checked={!current.category} onSelect={() => push({ category: undefined }, true)} />
        {categories.map((cat) => (
          <RadioRow
            key={cat.id}
            label={cat.name}
            checked={current.category === cat.slug}
            onSelect={() => push({ category: cat.slug }, true)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Concern">
        <RadioRow label="All concerns" checked={!current.concern} onSelect={() => push({ concern: undefined }, true)} />
        {concerns.map((c) => (
          <RadioRow
            key={c.id}
            label={c.title}
            checked={current.concern === c.slug}
            onSelect={() => push({ concern: c.slug }, true)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Price (৳)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => push({ minPrice: minPrice.trim() || undefined })}
            onKeyDown={(e) => e.key === "Enter" && push({ minPrice: minPrice.trim() || undefined })}
            placeholder="Min"
            className={priceInput}
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => push({ maxPrice: maxPrice.trim() || undefined })}
            onKeyDown={(e) => e.key === "Enter" && push({ maxPrice: maxPrice.trim() || undefined })}
            placeholder="Max"
            className={priceInput}
          />
        </div>
      </FilterGroup>

      <button
        type="button"
        onClick={clearAll}
        className="w-full rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted hover:text-primary hover:border-primary transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}

/** Collapsible filter section — click the header to open/close (chevron icon). */
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted"
      >
        {label}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="space-y-1.5 px-3 pb-3">{children}</div>}
    </div>
  );
}

/** A single option with a custom, clearly-colored selection circle. */
function RadioRow({ label, checked, onSelect }: { label: string; checked: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className="flex w-full cursor-pointer items-center gap-2.5 text-left text-sm"
    >
      <span
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          checked ? "border-primary" : "border-border"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className={checked ? "text-foreground font-medium" : "text-muted"}>{label}</span>
    </button>
  );
}
