import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { couponTypeEnum } from "./enums";

/**
 * Admin-managed discount coupons. A coupon discounts the ITEM SUBTOTAL only —
 * never the delivery fee. Codes are stored upper-cased (the validators
 * normalise input), so the unique index makes them case-insensitive.
 *
 * Orders don't reference this table by FK: they snapshot `couponCode` and the
 * computed `discount`, so deleting a coupon never rewrites order history.
 */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 40 }).notNull(),
    type: couponTypeEnum("type").notNull(),
    // Percent (1–100) for "percent", BDT amount for "fixed".
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    // Optional minimum item subtotal (BDT) the cart must reach.
    minSubtotal: numeric("min_subtotal", { precision: 10, scale: 2 }),
    // Optional ceiling on the discount (BDT) — mainly for percent coupons.
    maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    // NULL = unlimited. usedCount is bumped atomically inside the order transaction.
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("coupons_code_idx").on(table.code),
  })
);
