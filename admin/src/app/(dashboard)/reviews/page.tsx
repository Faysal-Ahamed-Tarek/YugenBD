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
import ImageUploader, { type EditableImage } from "@/components/ui/ImageUploader";

const TABS = ["all", ...REVIEW_STATUSES] as const;

export default function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof TABS)[number]>("all");
  const [reloadKey, setReloadKey] = useState(0);
  // null = closed, "new" = create, Review = edit that review.
  const [editing, setEditing] = useState<Review | "new" | null>(null);
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

  const toggleFeatured = async (review: Review) => {
    await api.patch(`/admin/reviews/${review.id}`, { isFeatured: !review.isFeatured });
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
      header: "Reviewer",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-sm font-semibold text-muted">
            {r.reviewerImageUrl ? (
              <Image src={r.reviewerImageUrl} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              r.name.charAt(0).toUpperCase()
            )}
          </span>
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-amber-500">{"★".repeat(r.rating)}<span className="text-border">{"★".repeat(5 - r.rating)}</span></p>
          </div>
        </div>
      ),
    },
    {
      header: "Product",
      cell: (r) => <span className="text-muted">{r.product?.title ?? "Shop review"}</span>,
    },
    {
      header: "Photos",
      cell: (r) =>
        r.images.length > 0 ? (
          <div className="flex -space-x-2">
            {r.images.slice(0, 3).map((img) => (
              <span key={img.id} className="relative h-9 w-9 overflow-hidden rounded-lg border-2 border-background bg-surface">
                <Image src={img.imageUrl} alt="" fill sizes="36px" className="object-cover" />
              </span>
            ))}
            {r.images.length > 3 && (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-background bg-surface text-xs text-muted">
                +{r.images.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted">—</span>
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
    {
      header: "Home slider",
      cell: (r) => (
        <button
          type="button"
          role="switch"
          aria-checked={r.isFeatured}
          aria-label={`Show ${r.name}'s review on the home page`}
          title={r.status !== "approved" ? "Only approved reviews appear on the storefront" : undefined}
          onClick={() => toggleFeatured(r)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            r.isFeatured ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              r.isFeatured ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      ),
    },
    { header: "Date", cell: (r) => <span className="text-muted">{formatDate(r.date)}</span> },
    {
      header: "Actions",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(r)}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            Edit
          </button>
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
          onClick={() => setEditing("new")}
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

      {editing && (
        <ReviewFormModal
          review={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
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

const toEditable = (urls: string[]): EditableImage[] =>
  urls.map((imageUrl, sortOrder) => ({ imageUrl, isMain: false, sortOrder }));

/**
 * Create / edit review content: reviewer name + photo, stars, text, ordered
 * review photos, the product it's about (optional — blank = shop review) and
 * the home-slider flag. Images go through the shared /uploads endpoint; on
 * save the full ordered image list is sent and replaces the review's images.
 */
function ReviewFormModal({
  review,
  onClose,
  onSaved,
}: {
  review: Review | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [product, setProduct] = useState<{ id: string; title: string } | null>(review?.product ?? null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [name, setName] = useState(review?.name ?? "");
  const [reviewerImageUrl, setReviewerImageUrl] = useState<string | null>(review?.reviewerImageUrl ?? null);
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [images, setImages] = useState<EditableImage[]>(toEditable(review?.images.map((i) => i.imageUrl) ?? []));
  const [isFeatured, setIsFeatured] = useState(review?.isFeatured ?? true);
  const [featuredOrder, setFeaturedOrder] = useState(review?.featuredOrder != null ? String(review.featuredOrder) : "");
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
    if (name.trim().length < 2) return setError("Enter a reviewer name.");
    if (comment.trim().length < 3) return setError("Write a short review.");
    if (images.length > 10) return setError("At most 10 review photos.");
    const order = featuredOrder.trim() === "" ? null : Number(featuredOrder);
    if (order !== null && (!Number.isInteger(order) || order < 0)) return setError("Slider position must be a whole number.");
    setSaving(true);
    const body = {
      productId: product?.id ?? null,
      name: name.trim(),
      reviewerImageUrl,
      rating,
      comment: comment.trim(),
      images: [...images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.imageUrl),
      isFeatured,
      featuredOrder: order,
    };
    try {
      if (review) await api.patch(`/admin/reviews/${review.id}`, body);
      else await api.post("/admin/reviews", body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save review.");
      setSaving(false);
    }
  };

  const inputClass = "w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary";

  return (
    <Modal open title={review ? "Edit Review" : "Add Review"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-[auto_1fr] items-start gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Reviewer photo</label>
            <SingleImageUpload value={reviewerImageUrl} onChange={setReviewerImageUrl} folder="reviews" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Reviewer name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
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
          <label className="block text-sm font-medium mb-1.5">Review text</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Review photos (optional, up to 10)</label>
          <ImageUploader images={images} onChange={setImages} folder="reviews" showMain={false} />
        </div>

        {/* Product picker — optional */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Product <span className="font-normal text-muted">(optional — leave empty for a general shop review)</span>
          </label>
          {product ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="font-medium">{product.title}</span>
              <button type="button" onClick={() => setProduct(null)} className="text-muted hover:text-primary">
                Remove
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className={inputClass}
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

        {/* Home slider */}
        <div className="rounded-lg border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Show in the home page reviews slider
          </label>
          {isFeatured && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <label htmlFor="featured-order" className="text-muted">Position</label>
              <input
                id="featured-order"
                type="number"
                min={0}
                value={featuredOrder}
                onChange={(e) => setFeaturedOrder(e.target.value)}
                placeholder="auto"
                className="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
              />
              <span className="text-xs text-muted">Lower shows first; blank = after numbered, newest first. Max 8 shown.</span>
            </div>
          )}
          {review && review.status !== "approved" && (
            <p className="mt-2 text-xs text-muted">This review is {review.status} — only approved reviews appear on the storefront.</p>
          )}
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
            {saving ? "Saving…" : review ? "Save Changes" : "Add Review"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
