import { pgTable, uuid, varchar, integer, boolean, text, timestamp, index } from "drizzle-orm/pg-core";

export const testimonialVideos = pgTable(
  "testimonial_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    videoUrl: varchar("video_url", { length: 500 }).notNull(),
    posterUrl: varchar("poster_url", { length: 500 }).notNull(),
    orderId: integer("order_id").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // The homepage queries "active only, ordered by orderId" — index both.
    isActiveIdx: index("testimonial_videos_is_active_idx").on(table.isActive),
    orderIdx: index("testimonial_videos_order_id_idx").on(table.orderId),
  })
);
