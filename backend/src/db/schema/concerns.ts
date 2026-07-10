import { pgTable, uuid, varchar, integer, timestamp, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core";
import { products } from "./products";

export const concerns = pgTable(
  "concerns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("concerns_slug_idx").on(table.slug),
  })
);

export const productConcerns = pgTable(
  "product_concerns",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    concernId: uuid("concern_id")
      .notNull()
      .references(() => concerns.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.concernId] }),
    concernIdx: index("product_concerns_concern_id_idx").on(table.concernId),
  })
);
