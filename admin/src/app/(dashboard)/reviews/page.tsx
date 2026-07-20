"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, REVIEW_STATUSES, REVIEW_STATUS_STYLES } from "@/lib/format";
import type { Product, Review, ReviewStatus } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SingleImageUpload from "@/components/ui/SingleImageUpload";

const TABS = ["all", ...REVIEW_STATUSES] as const;

export default function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof TABS)[number]>("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const filterRef = useRef(statusFilter);
  filterRef.current = statusFilter;

  const reload = () => setReloadKey((k) => k + 1);

  const fetchPage = useCallback(async ({ q, page }: { q: string; page: number }) => {
    const params = new URLSearchParams({ page: String(page), limit: "16" });
    if (q) params.set("q", q);
    if (filterRef.current !== "all") params.set("status", filterRef.current);
    const res = await api.get<Review[]>(`/admin/reviews?${params.toString()}`);
    return { rows: res.data, hasMore: res.meta?.pagination.hasMore ?? false };
  }, []);

  const selectTab = (tab: (typeof TABS)[number]) => {
    setStatusFilter(tab);
    reload();
  };

  const setStatus = async (review: Review, status: "approved" | "rejected") => {
    await api.patch(`/admin/reviews/${review.id}/status`, { status });
    reload();
  };

  // Permanent delete (row + its images), distinct from "Reject" which keeps
  // the review for the record. Confirmed first — there is no undo.
  // ConfirmDialog owns the loading/error state; it closes on success.
  const [deleting, setDeleting] = useState<Review | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    await api.del(`/admin/reviews/${deleting.id}`);
    reload();
  };

  const columns: Column<Review>[] = [
    {
      header: "Product",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
            {r.images[0]?.imageUrl && (
              <Image src={r.images[0].imageUrl} alt="" fill sizes="40px" className="object-cover" />
            )}
          </span>
          <span className="font-medium">{r.product?.title ?? "—"}</span>
        </div>
      ),
    },
    {
      header: "Reviewer",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-amber-500">{"★".repeat(r.rating)}<span className="text-border">{"★".repeat(5 - r.rating)}</span></p>
        </div>
      ),
    },
    { header: "Comment", cell: (r) => <ReviewComment text={r.comment} /> },
    {
      header: "Status",
      cell: (r) => (
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${REVIEW_STATUS_STYLES[r.status] ?? "bg-surface"}`}>
          {r.status}
        </span>
      ),
    },
    { header: "Date", cell: (r) => <span className="text-muted">{formatDate(r.date)}</span> },
    {
      header: "Actions",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          {r.status !== "approved" && (
            <button
              type="button"
              onClick={() => setStatus(r, "approved")}
              className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
          )}
          {r.status !== "rejected" && (
            <button
              type="button"
              onClick={() => setStatus(r, "rejected")}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted hover:border-red-500 hover:text-red-600 transition-colors"
            >
              Reject
            </button>
          )}
          <button
            type="button"
            aria-label={`Delete review by ${r.name}`}
            title="Delete permanently"
            onClick={() => setDeleting(r)}
            className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          + Add Review
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => selectTab(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              statusFilter === tab ? "bg-primary text-white" : "border border-border hover:border-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AdminTable
        columns={columns}
        fetchPage={fetchPage}
        getRowKey={(r) => r.id}
        searchPlaceholder="Search by reviewer or product…"
        reloadKey={reloadKey}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete review?"
        message={
          deleting
            ? `This permanently deletes ${deleting.name}'s review${
                deleting.product ? ` of ${deleting.product.title}` : ""
              } and its images. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete review"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      {adding && (
        <AddReviewModal
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

/** Comment cell — truncates long text with an inline expand toggle. */
function ReviewComment({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span className="text-muted">—</span>;
  const long = text.length > 80;
  if (!long) return <span className="text-muted">{text}</span>;
  return (
    <span className="text-muted">
      {open ? text : `${text.slice(0, 80)}… `}
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-primary hover:underline">
        {open ? "less" : "view full"}
      </button>
    </span>
  );
}

const STARS = [1, 2, 3, 4, 5];

function AddReviewModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (search.trim().length < 1) return setResults([]);
      const res = await api.get<Product[]>(`/products?q=${encodeURIComponent(search)}&limit=8`);
      setResults(res.data);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const save = async () => {
    setError(null);
    if (!product) return setError("Select a product.");
    if (name.trim().length < 2) return setError("Enter a reviewer name.");
    if (comment.trim().length < 3) return setError("Write a short review.");
    setSaving(true);
    try {
      await api.post("/admin/reviews", {
        productId: product.id,
        name: name.trim(),
        rating,
        comment: comment.trim(),
        ...(imageUrl ? { imageUrl } : {}),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add review.");
      setSaving(false);
    }
  };

  return (
    <Modal open title="Add Review" onClose={onClose}>
      <div className="space-y-4">
        {/* Product picker */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Product</label>
          {product ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="font-medium">{product.title}</span>
              <button type="button" onClick={() => setProduct(null)} className="text-muted hover:text-primary">
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
              />
              {results.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-52 overflow-y-auto">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setProduct(p);
                          setSearch("");
                          setResults([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-surface"
                      >
                        {p.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Reviewer name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Rating</label>
          <div className="flex gap-1">
            {STARS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className={`text-2xl leading-none ${s <= rating ? "text-amber-400" : "text-border"}`}
                aria-label={`${s} star${s > 1 ? "s" : ""}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Image (optional)</label>
          <SingleImageUpload value={imageUrl} onChange={setImageUrl} folder="reviews" />
        </div>

        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add Review"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
