import type { Metadata } from "next";
import { getReviewsPage } from "@/lib/api";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ReviewGrid from "@/components/reviews/ReviewGrid";
import LoadMoreReviews from "@/components/reviews/LoadMoreReviews";
import { socialMeta } from "@/lib/seo";

const PAGE_SIZE = 16;

const TITLE = "Customer Reviews";
const DESCRIPTION =
  "Read what customers across Bangladesh say about their authentic Japanese skincare, haircare and beauty products from YugenBD.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/reviews" },
  ...socialMeta({ title: `${TITLE} | YugenBD`, description: DESCRIPTION, url: "/reviews" }),
};

/**
 * Every approved review — the home "What Our Customers Say" slider's
 * "View all" lands here. Featured reviews first (admin order), then newest;
 * 16 per page with a "More reviews" button.
 */
export default async function ReviewsPage() {
  const { reviews, pagination } = await getReviewsPage(PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: TITLE }]} />

      <div className="mt-4">
        <h1 className="text-xl md:text-3xl font-semibold">What Our Customers Say</h1>
        {pagination.total > 0 && (
          <p className="mt-2 text-sm text-muted">
            {pagination.total} review{pagination.total === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <div className="mt-6">
        {reviews.length === 0 ? (
          <p className="py-16 text-center text-muted">No reviews yet.</p>
        ) : (
          <>
            <ReviewGrid reviews={reviews} />
            <LoadMoreReviews limit={PAGE_SIZE} initialHasMore={pagination.hasMore} />
          </>
        )}
      </div>
    </div>
  );
}
