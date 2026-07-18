import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Announcement-bar messages shown as a scrolling marquee under the home hero
 * (e.g. free-delivery offers). Variable count — admin adds/removes/reorders.
 * Storefront shows only isActive rows, ordered by sortOrder.
 */
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    text: varchar("text", { length: 300 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    isActiveIdx: index("announcements_is_active_idx").on(table.isActive),
    sortOrderIdx: index("announcements_sort_order_idx").on(table.sortOrder),
  })
);
