import type { Review } from "@/types";
import ReviewImageThumb from "./ReviewImageThumb";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8-5.3-2.8-5.3 2.8 1.1-5.8-4.3-4.1 5.9-.8z" />
    </svg>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** One review row: stars + date, avatar + name, comment, optional photo. */
export default function ReviewCard({ review }: { review: Review }) {
  const photo = review.images[0] ?? null;

  return (
    <article className="border-b border-border py-6 last:border-b-0">
      {/* Stars + date */}
      <div className="flex items-center justify-between">
        <div
          className="flex gap-0.5 text-foreground"
          role="img"
          aria-label={`Rated ${review.rating} out of 5 stars`}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} filled={i < review.rating} />
          ))}
        </div>
        <time dateTime={review.date} className="text-xs text-muted">
          {formatDate(review.date)}
        </time>
      </div>

      {/* Avatar + name */}
      <div className="mt-3 flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
          </svg>
        </span>
        <span className="text-[15px] font-medium text-foreground">{review.name}</span>
        {review.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            Verified
          </span>
        )}
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-foreground">{review.comment}</p>
      )}

      {/* Photo thumbnail — click to open lightbox */}
      {photo && (
        <ReviewImageThumb src={photo.imageUrl} alt={`Photo from ${review.name}'s review`} />
      )}
    </article>
  );
}
