import { eq, inArray } from "drizzle-orm";
import { db } from "../client";
import { products, reviews, reviewImages } from "../schema";
import { reviewerNames, reviewComments, reviewDayOffsets } from "./data/reviews";

const REVIEWS_PER_PRODUCT = 4;

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Seeds at least 4 dummy reviews for every PUBLISHED product that has none
 * yet. Idempotent: products that already have any review are skipped, so
 * real reviews are never diluted by re-running the seeder.
 */
export async function seedReviews() {
  const published = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(eq(products.status, "published"));

  if (published.length === 0) {
    console.log("No published products found, skipping reviews.");
    return;
  }

  const reviewed = await db
    .selectDistinct({ productId: reviews.productId })
    .from(reviews)
    .where(inArray(reviews.productId, published.map((p) => p.id)));
  const reviewedIds = new Set(reviewed.map((r) => r.productId));

  const targets = published.filter((product) => !reviewedIds.has(product.id));
  if (targets.length === 0) {
    console.log("Reviews already seeded, skipping.");
    return;
  }

  let totalReviews = 0;
  let totalImages = 0;

  for (const [productIndex, product] of targets.entries()) {
    for (let i = 0; i < REVIEWS_PER_PRODUCT; i++) {
      // Deterministic rotation through the pools, offset per product so
      // neighbouring products don't share identical review sets.
      const cursor = productIndex * REVIEWS_PER_PRODUCT + i;
      const rating = cursor % 3 === 0 ? 4 : 5; // mix of 4s and 5s
      const verified = i < 2; // a couple of verified reviews per product

      const [review] = await db
        .insert(reviews)
        .values({
          productId: product.id,
          userId: null,
          name: reviewerNames[cursor % reviewerNames.length],
          rating,
          verified,
          date: daysAgo(reviewDayOffsets[cursor % reviewDayOffsets.length]),
          comment: reviewComments[cursor % reviewComments.length],
        })
        .returning();
      totalReviews += 1;

      // Roughly half the reviews get one photo (placeholder URL, 404s by
      // design — the frontend falls back to its local placeholder).
      if (cursor % 2 === 0) {
        await db.insert(reviewImages).values({
          reviewId: review.id,
          imageUrl: `https://res.cloudinary.com/yugenbd/image/upload/v1/reviews/${product.slug}-review-${i + 1}.jpg`,
        });
        totalImages += 1;
      }
    }
  }

  console.log(
    `Seeded ${totalReviews} reviews (${totalImages} with images) across ${targets.length} products.`
  );
}
