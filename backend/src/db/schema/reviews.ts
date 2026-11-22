import { pgTable, uuid, varchar, integer, boolean, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { reviewStatusEnum } from "./enums";
import { products } from "./products";
import { users } from "./users";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable: admin-authored "shop" reviews (home slider) need not be tied to
    // a product. Guest submissions always carry one (enforced in the validator).
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: varchar("name", { length: 150 }).notNull(),
    rating: integer("rating").notNull(),
    verified: boolean("verified").notNull().default(false),
    // Moderation state. New guest reviews start 'pending' and are hidden from
    // the storefront until an admin approves. Existing seeded reviews are
    // backfilled to 'approved' in the migration (one-off) so they keep showing.
    status: reviewStatusEnum("status").notNull().default("pending"),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    comment: text("comment"),
    // Reviewer's own photo (avatar), uploaded by an admin via /uploads.
    reviewerImageUrl: varchar("reviewer_image_url", { length: 500 }),
    // Home-page "customer reviews" slider: featured + approved rows, ordered by
    // featuredOrder (NULLS LAST) then newest.
    isFeatured: boolean("is_featured").notNull().default(false),
    featuredOrder: integer("featured_order"),
  },
  (table) => ({
    productIdx: index("reviews_product_id_idx").on(table.productId),
    userIdx: index("reviews_user_id_idx").on(table.userId),
    statusIdx: index("reviews_status_idx").on(table.status),
    featuredIdx: index("reviews_is_featured_idx").on(table.isFeatured),
    ratingCheck: check("reviews_rating_check", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  })
);

export const reviewImages = pgTable(
  "review_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    reviewIdx: index("review_images_review_id_idx").on(table.reviewId),
  })
);
