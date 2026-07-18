"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Category, Concern } from "@/types";
import ProductFilters, { type ActiveFilters } from "./ProductFilters";

/**
 * Mobile "Filters" button that opens a slide-over panel (portaled to body,
 * like MobileSidebar). Reuses ProductFilters for the actual controls.
 *
 * Selecting a category/concern closes the panel (onDone) and then navigates,
 * so the customer sees the filtered results. This component is kept MOUNTED
 * across filter navigations (no `key` on the page) so `open` is stable local
 * state — remounting it mid-tap used to drop selections on touch devices.
 */
export default function MobileFilters({
  categories,
  concerns,
  current,
  activeCount,
}: {
  categories: Category[];
  concerns: Concern[];
  current: ActiveFilters;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5h16M7 12h10M10 19h4" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-end bg-black/50"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full hover:bg-surface transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <ProductFilters
                categories={categories}
                concerns={concerns}
                current={current}
                onDone={() => setOpen(false)}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
