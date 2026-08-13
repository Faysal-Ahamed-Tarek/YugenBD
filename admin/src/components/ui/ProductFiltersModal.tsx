"use client";

import Modal from "./Modal";
import type { Category, Concern } from "@/lib/types";

export interface ProductFilters {
  categorySlug: string | null;
  concernSlug: string | null;
}

/**
 * "Filters" panel for the admin products table — category (with
 * subcategories, indented under their parent) and concern, each a
 * single-select list. Picking an option applies immediately and closes the
 * panel; "Clear filters" resets both at once. Built on the shared Modal
 * (portal + backdrop + Escape-to-close).
 */
export default function ProductFiltersModal({
  open,
  onClose,
  categories,
  concerns,
  filters,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  concerns: Concern[];
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
}) {
  const selectCategory = (slug: string | null) => {
    onChange({ ...filters, categorySlug: slug });
    onClose();
  };
  const selectConcern = (slug: string | null) => {
    onChange({ ...filters, concernSlug: slug });
    onClose();
  };
  const clearAll = () => {
    onChange({ categorySlug: null, concernSlug: null });
    onClose();
  };

  return (
    <Modal open={open} title="Filters" onClose={onClose}>
      <div className="space-y-5">
        <FilterSection label="Category">
          <Row label="All categories" active={!filters.categorySlug} onSelect={() => selectCategory(null)} />
          {categories.map((cat) => (
            <div key={cat.id}>
              <Row
                label={cat.name}
                active={filters.categorySlug === cat.slug}
                onSelect={() => selectCategory(cat.slug)}
              />
              {cat.children && cat.children.length > 0 && (
                <div className="ml-4 space-y-1 border-l border-border pl-3">
                  {cat.children.map((sub) => (
                    <Row
                      key={sub.id}
                      label={sub.name}
                      active={filters.categorySlug === sub.slug}
                      onSelect={() => selectCategory(sub.slug)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </FilterSection>

        <FilterSection label="Concern">
          <Row label="All concerns" active={!filters.concernSlug} onSelect={() => selectConcern(null)} />
          {concerns.map((c) => (
            <Row
              key={c.id}
              label={c.title}
              active={filters.concernSlug === c.slug}
              onSelect={() => selectConcern(c.slug)}
            />
          ))}
        </FilterSection>

        {(filters.categorySlug || filters.concernSlug) && (
          <button
            type="button"
            onClick={clearAll}
            className="w-full rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted hover:border-primary hover:text-primary transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </Modal>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function Row({ label, active, onSelect }: { label: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface transition-colors"
    >
      <span
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          active ? "border-primary" : "border-border"
        }`}
      >
        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className={active ? "font-medium text-foreground" : "text-muted"}>{label}</span>
    </button>
  );
}
