import type { FeaturedReview } from "@/types";
import CustomerReviewCard from "@/components/home/CustomerReviewCard";

/** Responsive grid of review cards (1 → 2 → 3 columns). */
export default function ReviewGrid({ reviews }: { reviews: FeaturedReview[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {reviews.map((review) => (
        <li key={review.id} className="list-none">
          <CustomerReviewCard review={review} />
        </li>
      ))}
    </ul>
  );
}
