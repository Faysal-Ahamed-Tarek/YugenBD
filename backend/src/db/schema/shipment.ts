import { pgTable, uuid, date, timestamp } from "drizzle-orm/pg-core";

/**
 * Singleton-ish settings row: the admin-set "next shipment arrival" date,
 * shown on pre-order product pages ("we'll ship it by <date>") instead of a
 * hardcoded +15-days guess. The repository always updates the same row in
 * place (see shipment.repository.ts) rather than keeping history — the admin
 * page edits ONE current date.
 */
export const shipmentSettings = pgTable("shipment_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  expectedDate: date("expected_date").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
