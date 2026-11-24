"use client";

import { useState } from "react";
import type { ApiResponse, FeaturedReview } from "@/types";
import ReviewGrid from "./ReviewGrid";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * "More reviews" button for /reviews. Page 1 is server-rendered by the page;
 * this appends later pages fetched straight from the API and hides itself
 * once every review is shown.
 */
export default function LoadMoreReviews({ limit, initialHasMore }: { limit: number; initialHasMore: boolean }) {
  const [items, setItems] = useState<FeaturedReview[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    setError(false);
    const nextPage = page + 1;
    try {
      const res = await fetch(`${API_URL}/reviews/all?page=${nextPage}&limit=${limit}`);
      if (!res.ok) throw new Error("request failed");
      const json = (await res.json()) as ApiResponse<FeaturedReview[]>;
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

  if (!hasMore && items.length === 0) return null;

  return (
    <>
      {items.length > 0 && (
        <div className="mt-4 md:mt-6">
          <ReviewGrid reviews={items} />
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="cursor-pointer rounded-full border border-primary px-8 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-60 transition-colors"
          >
            {loading ? "Loading…" : "More reviews"}
          </button>
          {error && <p className="text-sm text-primary">Couldn&apos;t load more reviews. Please try again.</p>}
        </div>
      )}
    </>
  );
}
