"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import StarRating from "@/components/ui/StarRating";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * "Add Review" button + modal form (name, description, rating, one optional
 * image). Posts multipart/form-data straight to the Express API, then
 * router.refresh() re-fetches the (no-store) reviews so the new one shows.
 */
export default function AddReviewModal({ productId }: { productId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetForm = () => {
    setName("");
    setComment("");
    setRating(0);
    setFile(null);
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setError(null);
    setSubmitted(false);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const onPickImage = (selected: File | null) => {
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (selected.size > MAX_IMAGE_BYTES) {
      setError("Image is too large (max 5MB).");
      return;
    }
    setError(null);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError("Please enter your name.");
    if (rating < 1) return setError("Please select a star rating.");
    if (comment.trim().length < 3) return setError("Please write a short review.");

    const body = new FormData();
    body.append("productId", productId);
    body.append("name", name.trim());
    body.append("comment", comment.trim());
    body.append("rating", String(rating));
    if (file) body.append("image", file);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/reviews`, { method: "POST", body });
      if (res.status === 429) {
        setError("You're submitting too fast. Please try again in a few minutes.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Something went wrong. Please try again.");
        return;
      }
      // Review is created as 'pending' and won't show until an admin approves it.
      setSubmitted(true);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
      >
        Add Review
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add a review"
            onClick={close}
            className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-background p-5 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {submitted ? "Thanks for your review!" : "Write a Review"}
                </h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="p-1.5 rounded-full hover:bg-surface transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {submitted ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted">
                    Your review has been submitted and will appear once our team approves it.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label htmlFor="review-name" className="block text-sm font-medium mb-1.5">
                    Name
                  </label>
                  <input
                    id="review-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={150}
                    className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium mb-1.5">Rating</span>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                <div>
                  <label htmlFor="review-comment" className="block text-sm font-medium mb-1.5">
                    Description
                  </label>
                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition resize-none"
                    placeholder="Share your experience with this product…"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium mb-1.5">Photo (optional)</span>
                  {preview ? (
                    <div className="flex items-center gap-3">
                      <span className="relative h-16 w-16 overflow-hidden rounded-lg bg-surface">
                        <Image src={preview} alt="Selected preview" fill sizes="64px" className="object-cover" />
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onPickImage(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-sm text-muted hover:text-primary transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-muted hover:border-primary hover:text-primary transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <circle cx="9" cy="10" r="2" />
                        <path d="M21 16l-5-5-8 8" />
                      </svg>
                      Add one image
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>

                {error && (
                  <p role="alert" className="text-sm text-primary">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
              </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
