"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FeaturedReview } from "@/types";
import ProductImage from "@/components/product/ProductImage";
import Lightbox from "@/components/ui/Lightbox";

/** Photos shown on the card (one row); the last one carries "+N" for the rest. */
const MAX_THUMBS = 2;
/** Collapsed review text shows at most this many lines. */
const MAX_LINES = 3;
const TOGGLE = "cursor-pointer font-mediumtext-primary hover:text-primary-dark transition-colors";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
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
  // Collapsed, the comment shows at most MAX_LINES lines, ending "…last word… Read more".
  // A hidden twin paragraph (same width/font) is used to find how many characters fit;
  // `cut` is that length, or null when the whole comment already fits.
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState<number | null>(null);
  useEffect(() => {
    const el = measureRef.current;
    if (!el || !text) return;
    const fits = (n: number | null) => {
      el.textContent = n === null ? text : `${text.slice(0, n).trimEnd()}…`;
      if (n !== null) {
        const more = document.createElement("span");
        more.className = TOGGLE;
        more.textContent = " Read more";
        el.appendChild(more);
      }
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      return el.offsetHeight <= lineHeight * MAX_LINES + 1;
    };
    const measure = () => {
      if (fits(null)) return setCut(null);
      let lo = 0;
      let hi = text.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(mid)) lo = mid;
        else hi = mid - 1;
      }
      // Prefer ending on a whole word.
      const space = text.lastIndexOf(" ", lo);
      setCut(space > lo * 0.6 ? space : lo);
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, [text]);
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
    <article className="relative flex h-full flex-col rounded-2xl border border-border bg-background p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_-8px_rgb(0_0_0/0.12)]">
      {/* Decorative quote mark */}
      <svg className="absolute right-5 top-5 text-primary" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.6 6C6.5 7.3 4.5 10 4.5 13.4V18h5.6v-5.6H7.3c.1-2 1.3-3.6 3.2-4.5L9.6 6zm9 0c-3.1 1.3-5.1 4-5.1 7.4V18h5.6v-5.6h-2.8c.1-2 1.3-3.6 3.2-4.5L18.6 6z" />
      </svg>

      {/* Reviewer — right padding keeps the name/product clear of the quote mark. */}
      <div className="flex items-center gap-3 pr-12">
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
          <div className="mt-0.5 flex gap-0.5 text-primary" role="img" aria-label={`Rated ${review.rating} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} filled={i < review.rating} />
            ))}
          </div>
          {review.product ? (
            <Link
              href={`/product/${review.product.slug}`}
              className="block truncate text-xs text-muted hover:text-primary transition-colors"
            >
              on {review.product.title}
            </Link>
          ) : null}
        </div>
      </div>

      {text && (
        <div className="relative mt-4">
          <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
            {expanded || cut === null ? text : `${text.slice(0, cut).trimEnd()}…`}
            {cut !== null && (
              <>
                {" "}
                <button type="button" onClick={() => setExpanded((e) => !e)} className={TOGGLE}>
                  {expanded ? "Show less" : "Read more"}
                </button>
              </>
            )}
          </p>
          {/* Invisible twin used only for measuring where to cut. */}
          <p
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute inset-x-0 top-0 text-[15px] leading-relaxed whitespace-pre-line"
          />
        </div>
      )}

      {thumbs.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3" aria-label={`Photos from ${review.name}`}>
          {thumbs.map((img, i) => {
            const isLast = i === thumbs.length - 1 && hidden > 0;
            return (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  aria-label={isLast ? `View all ${images.length} photos` : `View photo ${i + 1}`}
                  className="group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl bg-surface ring-1 ring-border hover:ring-primary transition-all"
                >
                  <ProductImage src={img.imageUrl} alt={`Photo ${i + 1} from ${review.name}'s review`} sizes="(max-width: 640px) 42vw, (max-width: 1024px) 23vw, 190px" />
                  {isLast && (
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-lg font-semibold text-background">
                      +{hidden}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

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
