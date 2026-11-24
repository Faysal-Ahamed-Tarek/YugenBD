import { and, asc, desc, eq, gte, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { reviews, reviewImages, products } from "../../db/schema";
import type {
  AdminCreateReviewInput,
  AdminListReviewsQuery,
  AdminUpdateReviewInput,
  CreateReviewInput,
  ListAllReviewsQuery,
} from "./review.validators";

// Review photos always come back in their admin-chosen order.
const orderedImages = {
  orderBy: [asc(reviewImages.sortOrder), asc(reviewImages.id)],
};
const productSummary = { columns: { id: true, title: true, slug: true } } as {
  columns: { id: true; title: true; slug: true };
};

export const reviewRepository = {
  /** Storefront reviews for a product — APPROVED only, newest first, with images. */
  findByProductId(productId: string) {
    return db.query.reviews.findMany({
      where: and(eq(reviews.productId, productId), eq(reviews.status, "approved")),
      orderBy: desc(reviews.date),
      with: {
        images: orderedImages,
      },
    });
  },

  /** Featured + approved reviews for the home slider, in admin order. */
  findFeatured(limit: number) {
    return db.query.reviews.findMany({
      where: and(eq(reviews.isFeatured, true), eq(reviews.status, "approved")),
      orderBy: [sql`${reviews.featuredOrder} ASC NULLS LAST`, desc(reviews.date)],
      limit,
      with: { images: orderedImages, product: productSummary },
    });
  },

  /**
   * Public "all reviews" page: every APPROVED review, featured ones first (in
   * admin order), then newest. `id` breaks ties so Load More pages stay stable.
   */
  async findApprovedPage(query: ListAllReviewsQuery) {
    const where = eq(reviews.status, "approved");
    const [rows, [{ count }]] = await Promise.all([
      db.query.reviews.findMany({
        where,
        orderBy: [
          desc(reviews.isFeatured),
          sql`${reviews.featuredOrder} ASC NULLS LAST`,
          desc(reviews.date),
          desc(reviews.id),
        ],
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        with: { images: orderedImages, product: productSummary },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(reviews).where(where),
    ]);
    return { rows, total: count };
  },

  /** Fallback filler for the slider: latest approved 4★+ reviews with text. */
  findLatestPositive(limit: number, excludeIds: string[]) {
    const conditions = [
      eq(reviews.status, "approved"),
      gte(reviews.rating, 4),
      sql`coalesce(length(${reviews.comment}), 0) > 0`,
    ];
    if (excludeIds.length > 0) conditions.push(notInArray(reviews.id, excludeIds));
    return db.query.reviews.findMany({
      where: and(...conditions),
      orderBy: desc(reviews.date),
      limit,
      with: { images: orderedImages, product: productSummary },
    });
  },

  findByIdWithRelations(id: string) {
    return db.query.reviews.findFirst({
      where: eq(reviews.id, id),
      with: { images: orderedImages, product: productSummary },
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
   * verified = true, with its ordered images, in one transaction.
   */
  createByAdmin(input: AdminCreateReviewInput) {
    const { images, ...fields } = input;
    return db.transaction(async (tx) => {
      const [review] = await tx
        .insert(reviews)
        .values({ ...fields, userId: null, verified: true, status: "approved" })
        .returning();
      if (images.length > 0) {
        await tx
          .insert(reviewImages)
          .values(images.map((imageUrl, sortOrder) => ({ reviewId: review.id, imageUrl, sortOrder })));
      }
      return review;
    });
  },

  /**
   * Update admin-editable content. When `images` is present it replaces the
   * review's images wholesale (delete + insert in list order). Returns null
   * when the review doesn't exist.
   */
  updateContent(id: string, input: AdminUpdateReviewInput) {
    const { images, ...fields } = input;
    return db.transaction(async (tx) => {
      const [review] =
        Object.keys(fields).length > 0
          ? await tx.update(reviews).set(fields).where(eq(reviews.id, id)).returning()
          : await tx.select().from(reviews).where(eq(reviews.id, id));
      if (!review) return null;
      if (images) {
        await tx.delete(reviewImages).where(eq(reviewImages.reviewId, id));
        if (images.length > 0) {
          await tx
            .insert(reviewImages)
            .values(images.map((imageUrl, sortOrder) => ({ reviewId: id, imageUrl, sortOrder })));
        }
      }
      return review;
    });
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
          images: orderedImages,
          product: productSummary,
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
