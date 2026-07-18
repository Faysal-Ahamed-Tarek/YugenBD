import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { faqSegmentEnum } from "./enums";

/**
 * Admin-managed FAQ (Help Centre) questions. Each row belongs to one of the
 * four fixed segments (products / orders / delivery / returns). The storefront
 * shows only isActive rows, grouped by segment and ordered by sortOrder.
 */
export const faqItems = pgTable(
  "faq_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    segment: faqSegmentEnum("segment").notNull(),
    question: varchar("question", { length: 300 }).notNull(),
    // Plain text; blank lines separate paragraphs when rendered.
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Storefront queries "active, by segment, ordered" — index segment + order.
    segmentIdx: index("faq_items_segment_idx").on(table.segment),
    sortOrderIdx: index("faq_items_sort_order_idx").on(table.sortOrder),
  })
);
