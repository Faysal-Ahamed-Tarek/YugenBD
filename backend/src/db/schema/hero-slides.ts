import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Homepage hero carousel slides. Variable count — the admin adds/removes as
 * many as they want (replaces the old fixed set of static hero-{1..4}.jpg
 * files). Storefront shows only isActive rows, ordered by sortOrder.
 */
export const heroSlides = pgTable(
  "hero_slides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    isActiveIdx: index("hero_slides_is_active_idx").on(table.isActive),
    sortOrderIdx: index("hero_slides_sort_order_idx").on(table.sortOrder),
  })
);
