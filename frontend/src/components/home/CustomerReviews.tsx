import Link from "next/link";
import type { FeaturedReview } from "@/types";
import Carousel from "@/components/ui/Carousel";
import CustomerReviewCard from "./CustomerReviewCard";

/**
 * "What our customers say" — up to 8 reviews in a native scroll-snap slider,
 * shown last on the home page (directly above the footer). The backend picks
 * the 8 (admin-featured first, then latest 4★+); "View all" opens /reviews.
 * Renders nothing when there are no reviews or the backend is unreachable.
 */
export default function CustomerReviews({ reviews }: { reviews: FeaturedReview[] }) {
  const items = reviews.slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="customer-reviews-title" className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <div className="mb-4 md:mb-6 flex items-center justify-between">
        <h2 id="customer-reviews-title" className="text-xl md:text-2xl font-semibold">
          What Our Customers Say
        </h2>
        <Link
          href="/reviews"
          className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          View all →
        </Link>
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
    </section>
  );
}
