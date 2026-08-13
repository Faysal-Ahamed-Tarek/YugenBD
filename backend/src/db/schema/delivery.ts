import { pgTable, uuid, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Singleton settings row for delivery pricing rules, replacing the old
 * hardcoded FREE_DELIVERY_THRESHOLD = 3000 constant. The repository always
 * updates the same row in place (see delivery.repository.ts) — the admin page
 * edits ONE current config.
 *
 * `alwaysFree` short-circuits the threshold entirely: when on, every order
 * ships free regardless of subtotal.
 */
export const deliverySettings = pgTable("delivery_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  freeDeliveryThreshold: numeric("free_delivery_threshold", { precision: 10, scale: 2 })
    .notNull()
    .default("3000.00"),
  alwaysFree: boolean("always_free").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
