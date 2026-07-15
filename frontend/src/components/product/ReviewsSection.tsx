import { getReviewsByProductId } from "@/lib/api";
import ReviewCard from "./ReviewCard";
import AddReviewModal from "./AddReviewModal";

/**
 * Server component: fetches and renders a product's reviews below the
 * accordion. Header has the product-specific title on the left and the
 * "Add Review" action on the right. One column on mobile, two on desktop;
 * each card carries a hairline divider except the last one.
 */
export default async function ReviewsSection({
  productId,
  productTitle,
}: {
  productId: string;
  productTitle: string;
}) {
  const reviews = await getReviewsByProductId(productId);

  return (
    <section aria-label="Customer reviews" className="mt-10 md:mt-14">
      <div className="mb-4 md:mb-6 flex items-start justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-semibold">
          Customer Reviews
          {reviews.length > 0 && (
            <span className="text-muted font-normal"> ({reviews.length})</span>
          )}
        </h2>
        <AddReviewModal productId={productId} />
      </div>

      {reviews.length === 0 ? (
        <p className="border-y border-border py-6 text-sm text-muted">
          No reviews yet. Be the first to review this product.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 border-t border-border">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}
