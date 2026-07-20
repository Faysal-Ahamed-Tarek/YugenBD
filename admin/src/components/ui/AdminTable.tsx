"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface FetchResult<T> {
  rows: T[];
  hasMore: boolean;
}

/**
 * Generic admin table: debounced search (drives a `q` param via fetchPage),
 * 16 rows initial + "Load More" appending the next page, and per-row
 * edit/delete actions. Works for both paginated (products/orders) and small
 * non-paginated (categories/concerns) resources via the fetchPage adapter.
 */
export default function AdminTable<T>({
  columns,
  fetchPage,
  getRowKey,
  onEdit,
  onDelete,
  onRowClick,
  searchPlaceholder = "Search…",
  reloadKey = 0,
}: {
  columns: Column<T>[];
  fetchPage: (params: { q: string; page: number }) => Promise<FetchResult<T>>;
  getRowKey: (row: T) => string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  /** When set, the whole row becomes clickable (e.g. navigate to a detail page). */
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  reloadKey?: number;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (query: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPage({ q: query, page: 1 });
        setRows(result.rows);
        setHasMore(result.hasMore);
        setPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setRows([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage]
  );

  // Debounced reload on search change and when reloadKey bumps (after edits).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, reloadKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const result = await fetchPage({ q, page: next });
      setRows((prev) => [...prev, ...result.rows]);
      setHasMore(result.hasMore);
      setPage(next);
    } catch {
      /* keep existing rows on failure */
    } finally {
      setLoadingMore(false);
    }
  };

  const hasActions = Boolean(onEdit || onDelete);

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full max-w-sm h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              {columns.map((col) => (
                <th key={col.header} className={`px-4 py-3 font-semibold ${col.className ?? ""}`}>
                  {col.header}
                </th>
              ))}
              {hasActions && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-10 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-10 text-center text-primary">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-10 text-center text-muted">
                  No results found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-border last:border-b-0 hover:bg-surface/60 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.header} className={`px-4 py-3 ${col.className ?? ""}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                  {hasActions && (
                    // stopPropagation: on a table that also has onRowClick, an
                    // action click must not additionally navigate the row.
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            type="button"
                            aria-label="Edit"
                            onClick={() => onEdit(row)}
                            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
                              <path d="M13.5 6.5l3 3" />
                            </svg>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={() => onDelete(row)}
                            className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && !loading && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-primary px-8 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-60 transition-colors"
          >
            {loadingMore ? "Loading…" : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
