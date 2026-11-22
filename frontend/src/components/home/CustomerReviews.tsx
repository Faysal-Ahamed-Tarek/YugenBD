import type { FeaturedReview } from "@/types";
import Carousel from "@/components/ui/Carousel";
import CustomerReviewCard from "./CustomerReviewCard";

/**
 * "What our customers say" — up to 8 reviews in a native scroll-snap slider,
 * shown last on the home page (directly above the footer). No "view all":
 * the backend already picks the 8 (admin-featured first, then latest 4★+).
 * Renders nothing when there are no reviews or the backend is unreachable.
 */
export default function CustomerReviews({ reviews }: { reviews: FeaturedReview[] }) {
  const items = reviews.slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="customer-reviews-title" className="mt-8 md:mt-12 bg-primary-light">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="mb-6 md:mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Customer Reviews</p>
          <h2 id="customer-reviews-title" className="mt-2 text-2xl md:text-3xl font-semibold text-foreground">
            What Our Customers Say
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            Real words and real photos from people who glow with YugenBD.
          </p>
        </div>

        <Carousel
          label="Customer reviews"
          mobileArrows
          itemColsClass="auto-cols-[86%] sm:auto-cols-[calc(50%-8px)] lg:auto-cols-[calc(33.333%-11px)]"
        >
          {items.map((review) => (
            <li key={review.id} className="snap-start list-none h-full">
              <CustomerReviewCard review={review} />
            </li>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
