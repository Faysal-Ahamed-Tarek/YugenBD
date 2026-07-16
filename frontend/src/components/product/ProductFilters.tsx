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

/* Fixed slider bounds — catalog prices live comfortably inside ৳0–৳5,000. */
const PRICE_MIN = 0;
const PRICE_MAX = 5000;
const PRICE_STEP = 100;

/**
 * Filter controls (category, concern, price range). Shared by the desktop
 * sidebar and the mobile slide-over. Picking a category/concern closes the
 * mobile panel FIRST (via `onDone`), then navigates — the customer sees the
 * results immediately. Price is a dual-thumb slider that applies on release.
 * "Clear all" resets to /products.
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
  const clampPrice = (v: string | undefined, fallback: number) => {
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isNaN(n) ? fallback : Math.min(PRICE_MAX, Math.max(PRICE_MIN, n));
  };
  const [minPrice, setMinPrice] = useState(() => clampPrice(current.minPrice, PRICE_MIN));
  const [maxPrice, setMaxPrice] = useState(() => clampPrice(current.maxPrice, PRICE_MAX));

  // Merge a change into the current filters and push to the URL (server refetch).
  const push = (next: Partial<ActiveFilters>) => {
    const merged = { ...current, ...next };
    const qs = new URLSearchParams();
    if (merged.q) qs.set("q", merged.q);
    if (merged.category) qs.set("category", merged.category);
    if (merged.concern) qs.set("concern", merged.concern);
    if (merged.minPrice) qs.set("minPrice", String(merged.minPrice));
    if (merged.maxPrice) qs.set("maxPrice", String(merged.maxPrice));
    router.push(qs.size > 0 ? `/products?${qs.toString()}` : "/products");
  };

  // Category/concern: close the mobile panel first, then apply.
  const select = (next: Partial<ActiveFilters>) => {
    onDone?.();
    push(next);
  };

  // Slider release: thumbs at the outer bounds mean "no limit". Only commits
  // when the range actually moved (so tapping a thumb doesn't navigate), and
  // like category/concern it closes the mobile panel before showing results.
  const commitPrice = () => {
    const appliedMin = clampPrice(current.minPrice, PRICE_MIN);
    const appliedMax = clampPrice(current.maxPrice, PRICE_MAX);
    if (minPrice === appliedMin && maxPrice === appliedMax) return;
    onDone?.();
    push({
      minPrice: minPrice > PRICE_MIN ? String(minPrice) : undefined,
      maxPrice: maxPrice < PRICE_MAX ? String(maxPrice) : undefined,
    });
  };

  const clearAll = () => {
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    onDone?.();
    router.push("/products");
  };

  return (
    <div className="space-y-3">
      <FilterGroup label="Price (৳)">
        {/* Dual-thumb slider: drag either end; the filter applies on release.
            Thumbs resting at the outer edges mean "no min/max". */}
        <div className="px-1 pt-1">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{formatTaka(minPrice)}</span>
            <span>
              {formatTaka(maxPrice)}
              {maxPrice === PRICE_MAX ? "+" : ""}
            </span>
          </div>

          <div className="dual-range relative mt-3 h-5">
            {/* Track + selected-range highlight */}
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
              style={{
                left: `${(minPrice / PRICE_MAX) * 100}%`,
                right: `${100 - (maxPrice / PRICE_MAX) * 100}%`,
              }}
            />
            <input
              type="range"
              aria-label="Minimum price"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={minPrice}
              onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - PRICE_STEP))}
              onPointerUp={commitPrice}
              onKeyUp={commitPrice}
              onTouchEnd={commitPrice}
            />
            <input
              type="range"
              aria-label="Maximum price"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + PRICE_STEP))}
              onPointerUp={commitPrice}
              onKeyUp={commitPrice}
              onTouchEnd={commitPrice}
            />
          </div>
        </div>
      </FilterGroup>

      <FilterGroup label="Category">
        <RadioRow label="All categories" checked={!current.category} onSelect={() => select({ category: undefined })} />
        {categories.map((cat) => (
          <RadioRow
            key={cat.id}
            label={cat.name}
            checked={current.category === cat.slug}
            onSelect={() => select({ category: cat.slug })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Concern">
        <RadioRow label="All concerns" checked={!current.concern} onSelect={() => select({ concern: undefined })} />
        {concerns.map((c) => (
          <RadioRow
            key={c.id}
            label={c.title}
            checked={current.concern === c.slug}
            onSelect={() => select({ concern: c.slug })}
          />
        ))}
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

/** ৳-formatted slider value (no decimals, en-BD thousands separators). */
function formatTaka(value: number): string {
  return `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
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
