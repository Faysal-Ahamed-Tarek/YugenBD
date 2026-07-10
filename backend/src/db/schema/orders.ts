import { pgTable, uuid, varchar, integer, numeric, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { orderStatusEnum, deliveryZoneEnum, paymentMethodEnum, paymentStatusEnum } from "./enums";
import { users } from "./users";
import { products } from "./products";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    address: text("address").notNull(),
    deliveryZone: deliveryZoneEnum("delivery_zone").notNull(),
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull(),
    deliveryEstimate: text("delivery_estimate").notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    // Payment: 'cod' (default) or 'bkash' manual Send Money reference. The
    // bKash fields are the customer-typed transaction id + amount they sent;
    // paymentStatus is flipped to 'verified' by an admin after cross-checking.
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
    bkashTransactionId: text("bkash_transaction_id"),
    bkashAmount: numeric("bkash_amount", { precision: 10, scale: 2 }),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("orders_status_idx").on(table.status),
  })
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // set-null (not cascade) so an order line survives product deletion — the
    // title/price/imageUrl snapshot keeps the order historically accurate.
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    imageUrl: varchar("image_url", { length: 500 }),
    weightLabel: varchar("weight_label", { length: 50 }),
    quantity: integer("quantity").notNull(),
    // True when the product/weight had 0 stock at order time — the order is
    // still accepted (pre-order) and ships when restocked. See Part 3c.
    isPreOrder: boolean("is_pre_order").notNull().default(false),
  },
  (table) => ({
    orderIdx: index("order_items_order_id_idx").on(table.orderId),
  })
);
