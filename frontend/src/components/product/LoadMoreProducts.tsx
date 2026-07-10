"use client";

import { useState } from "react";
import type { Product, ProductListParams, ApiResponse } from "@/types";
import ProductGrid from "./ProductGrid";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Explicit "Load More" pagination (no infinite scroll). The initial page is
 * server-rendered by the page; this client component appends subsequent
 * pages fetched directly from the API. The button only exists while more
 * products remain, and hides itself once exhausted.
 */
export default function LoadMoreProducts({
  params,
  initialHasMore,
  initialPage = 1,
  gapClass,
}: {
  params: ProductListParams;
  initialHasMore: boolean;
  initialPage?: number;
  gapClass?: string;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    setError(false);
    const nextPage = page + 1;
    const qs = new URLSearchParams();
    Object.entries({ ...params, page: nextPage }).forEach(([key, value]) => {
      if (value !== undefined) qs.set(key, String(value));
    });

    try {
      const res = await fetch(`${API_URL}/products?${qs.toString()}`);
      if (!res.ok) throw new Error("request failed");
      const json = (await res.json()) as ApiResponse<Product[]>;
      if (!json.success) throw new Error("bad response");
      setItems((prev) => [...prev, ...json.data]);
      setPage(nextPage);
      setHasMore(json.meta?.pagination.hasMore ?? false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Never render anything if the first page already covered everything.
  if (!hasMore && items.length === 0) return null;

  return (
    <>
      {items.length > 0 && (
        <div className={gapClass ? "mt-8" : "mt-3 md:mt-4"}>
          <ProductGrid products={items} gapClass={gapClass} />
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-primary px-8 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-60 transition-colors"
          >
            {loading ? "Loading…" : "Load More"}
          </button>
          {error && (
            <p className="text-sm text-primary">Couldn&apos;t load more. Please try again.</p>
          )}
        </div>
      )}
    </>
  );
}
