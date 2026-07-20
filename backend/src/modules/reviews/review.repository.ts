import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { reviews, reviewImages, products } from "../../db/schema";
import type { AdminListReviewsQuery, CreateReviewInput } from "./review.validators";

export const reviewRepository = {
  /** Storefront reviews for a product — APPROVED only, newest first, with images. */
  findByProductId(productId: string) {
    return db.query.reviews.findMany({
      where: and(eq(reviews.productId, productId), eq(reviews.status, "approved")),
      orderBy: desc(reviews.date),
      with: {
        images: true,
      },
    });
  },

  findProduct(productId: string) {
    return db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: { id: true, status: true },
    });
  },

  /** Guest-submitted review — starts as 'pending' (awaits moderation). */
  create(input: CreateReviewInput) {
    return db
      .insert(reviews)
      .values({
        productId: input.productId,
        userId: null,
        name: input.name,
        rating: input.rating,
        comment: input.comment,
        verified: false, // guest-submitted reviews are unverified
        status: "pending",
      })
      .returning()
      .then((rows) => rows[0]);
  },

  /**
   * Admin-authored review — created 'approved' (no moderation needed) and
   * verified = true (reasonable default for shop-added reviews).
   */
  createByAdmin(input: CreateReviewInput) {
    return db
      .insert(reviews)
      .values({
        productId: input.productId,
        userId: null,
        name: input.name,
        rating: input.rating,
        comment: input.comment,
        verified: true,
        status: "approved",
      })
      .returning()
      .then((rows) => rows[0]);
  },

  addImage(reviewId: string, imageUrl: string) {
    return db
      .insert(reviewImages)
      .values({ reviewId, imageUrl })
      .returning()
      .then((rows) => rows[0]);
  },

  /**
   * Admin moderation list — ALL statuses, filter by status/productId, search by
   * reviewer name OR product title, paginated newest first. Each row carries its
   * product title/slug and images.
   */
  async adminFindMany(query: AdminListReviewsQuery) {
    const conditions = [];
    if (query.status) conditions.push(eq(reviews.status, query.status));
    if (query.productId) conditions.push(eq(reviews.productId, query.productId));
    if (query.q) {
      // Match reviewer name or product title. Resolve product ids for the title
      // part first so the main query stays a simple OR on indexed columns.
      const productMatches = await db
        .select({ id: products.id })
        .from(products)
        .where(ilike(products.title, `%${query.q}%`));
      const productIds = productMatches.map((p) => p.id);
      conditions.push(
        productIds.length > 0
          ? or(ilike(reviews.name, `%${query.q}%`), inArray(reviews.productId, productIds))
          : ilike(reviews.name, `%${query.q}%`)
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.limit;

    const [rows, [{ count }]] = await Promise.all([
      db.query.reviews.findMany({
        where,
        orderBy: desc(reviews.date),
        limit: query.limit,
        offset,
        with: {
          images: true,
          product: { columns: { id: true, title: true, slug: true } },
        },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(reviews).where(where),
    ]);

    return { rows, total: count };
  },

  updateStatus(id: string, status: "approved" | "rejected") {
    return db
      .update(reviews)
      .set({ status })
      .where(eq(reviews.id, id))
      .returning()
      .then((rows) => rows[0] ?? null);
  },

  /**
   * Permanently delete a review. Its review_images rows go with it via the
   * ON DELETE CASCADE FK. Returns the deleted id, or null when not found.
   */
  deleteById(id: string) {
    return db
      .delete(reviews)
      .where(eq(reviews.id, id))
      .returning({ id: reviews.id })
      .then((rows) => rows[0] ?? null);
  },
};
