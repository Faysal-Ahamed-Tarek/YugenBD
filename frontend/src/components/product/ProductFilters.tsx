"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Concern } from "@/types";

export interface ActiveFilters {
  category?: string;
  concern?: string;
  minPrice?: string;
  maxPrice?: string;
}

/**
 * Filter controls (category, concern, price range). Shared by the desktop
 * sidebar and the mobile slide-over. "Apply" writes the selections into the
 * URL searchParams so filters are shareable and the server re-fetches;
 * "Clear all" resets to /products. `onDone` lets the mobile panel close.
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
  const [category, setCategory] = useState(current.category ?? "");
  const [concern, setConcern] = useState(current.concern ?? "");
  const [minPrice, setMinPrice] = useState(current.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(current.maxPrice ?? "");

  const apply = () => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (concern) qs.set("concern", concern);
    if (minPrice.trim()) qs.set("minPrice", minPrice.trim());
    if (maxPrice.trim()) qs.set("maxPrice", maxPrice.trim());
    router.push(qs.size > 0 ? `/products?${qs.toString()}` : "/products");
    onDone?.();
  };

  const clearAll = () => {
    setCategory("");
    setConcern("");
    setMinPrice("");
    setMaxPrice("");
    router.push("/products");
    onDone?.();
  };

  return (
    <div className="space-y-6">
      <FilterGroup label="Category">
        <RadioRow name="category" label="All categories" checked={category === ""} onChange={() => setCategory("")} />
        {categories.map((cat) => (
          <RadioRow
            key={cat.id}
            name="category"
            label={cat.name}
            checked={category === cat.slug}
            onChange={() => setCategory(cat.slug)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Concern">
        <RadioRow name="concern" label="All concerns" checked={concern === ""} onChange={() => setConcern("")} />
        {concerns.map((c) => (
          <RadioRow
            key={c.id}
            name="concern"
            label={c.title}
            checked={concern === c.slug}
            onChange={() => setConcern(c.slug)}
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
            placeholder="Min"
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition"
          />
        </div>
      </FilterGroup>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={apply}
          className="flex-1 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted hover:text-primary hover:border-primary transition-colors"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function RadioRow({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-primary"
      />
      <span className={checked ? "text-foreground font-medium" : "text-muted"}>{label}</span>
    </label>
  );
}
