"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { FeaturedReview } from "@/types";
import ProductImage from "@/components/product/ProductImage";
import Lightbox from "@/components/ui/Lightbox";

/** Text longer than this gets clamped with a "Read more" toggle. */
const CLAMP_AT = 180;
/** Thumbnails shown on the card; the last one carries "+N" for the rest. */
const MAX_THUMBS = 4;

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8-5.3-2.8-5.3 2.8 1.1-5.8-4.3-4.1 5.9-.8z" />
    </svg>
  );
}

/** Reviewer photo; falls back to their initial when missing or broken. */
function Avatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light text-base font-semibold text-primary ring-2 ring-background">
      {src && !failed ? (
        <Image src={src} alt={name} fill sizes="44px" onError={() => setFailed(true)} className="object-cover" />
      ) : (
        <span aria-hidden="true">{name.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </span>
  );
}

export default function CustomerReviewCard({ review }: { review: FeaturedReview }) {
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const text = review.comment ?? "";
  const long = text.length > CLAMP_AT;
  const images = review.images;
  const thumbs = images.slice(0, MAX_THUMBS);
  const hidden = images.length - thumbs.length;

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length]
  );
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length]
  );

  return (
    <article className="relative flex h-full flex-col rounded-2xl border border-border bg-background p-5 md:p-6 shadow-sm">
      {/* Decorative quote mark */}
      <svg className="absolute right-5 top-5 text-primary-light" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.6 6C6.5 7.3 4.5 10 4.5 13.4V18h5.6v-5.6H7.3c.1-2 1.3-3.6 3.2-4.5L9.6 6zm9 0c-3.1 1.3-5.1 4-5.1 7.4V18h5.6v-5.6h-2.8c.1-2 1.3-3.6 3.2-4.5L18.6 6z" />
      </svg>

      <div className="flex gap-0.5 text-primary" role="img" aria-label={`Rated ${review.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} filled={i < review.rating} />
        ))}
      </div>

      {text && (
        <div className="mt-4 flex-1">
          <p className={`text-[15px] leading-relaxed text-foreground ${long && !expanded ? "line-clamp-5" : ""}`}>
            {text}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {thumbs.length > 0 && (
        <ul className="mt-4 flex gap-2" aria-label={`Photos from ${review.name}`}>
          {thumbs.map((img, i) => {
            const isLast = i === thumbs.length - 1 && hidden > 0;
            return (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  aria-label={isLast ? `View all ${images.length} photos` : `View photo ${i + 1}`}
                  className="group relative block h-16 w-16 overflow-hidden rounded-lg bg-surface ring-1 ring-border hover:ring-primary transition-all"
                >
                  <ProductImage src={img.imageUrl} alt={`Photo ${i + 1} from ${review.name}'s review`} sizes="64px" />
                  {isLast && (
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-sm font-semibold text-background">
                      +{hidden}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <Avatar src={review.reviewerImageUrl} name={review.name} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="truncate">{review.name}</span>
            {review.verified && (
              <svg className="shrink-0 text-primary" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified buyer" role="img">
                <path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.6-.6 2.9.9 2.9-2.4 1.8-.6 2.9-3 .5L12 22l-2.4-1.8-3 .2-1-2.8-2.6-1.6.6-2.9L2.7 10.2l2.4-1.8.6-2.9 3-.5L12 2zm-1.2 13.6l5.6-5.6-1.4-1.4-4.2 4.2-2-2-1.4 1.4 3.4 3.4z" />
              </svg>
            )}
          </p>
          {review.product ? (
            <Link
              href={`/product/${review.product.slug}`}
              className="block truncate text-xs text-muted hover:text-primary transition-colors"
            >
              on {review.product.title}
            </Link>
          ) : (
            <p className="text-xs text-muted">{review.verified ? "Verified buyer" : "Customer"}</p>
          )}
        </div>
      </div>

      {openIndex !== null && images[openIndex] && (
        <Lightbox
          src={images[openIndex].imageUrl}
          alt={`Photo ${openIndex + 1} from ${review.name}'s review`}
          onClose={close}
          onPrev={images.length > 1 ? prev : undefined}
          onNext={images.length > 1 ? next : undefined}
          caption={images.length > 1 ? `${openIndex + 1} / ${images.length}` : undefined}
        />
      )}
    </article>
  );
}
