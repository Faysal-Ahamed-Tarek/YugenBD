import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);
export const productStatusEnum = pgEnum("product_status", ["draft", "published"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);
export const deliveryZoneEnum = pgEnum("delivery_zone", ["inside_dhaka", "outside_dhaka"]);
// bKash here means manual "Send Money" reference entry only (customer-typed
// transaction id/amount), never a payment gateway integration.
export const paymentMethodEnum = pgEnum("payment_method", ["bkash", "cod"]);
// Only meaningful for bKash orders — an admin flips it to "verified" after
// cross-checking the transaction. COD orders stay "pending".
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "verified"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
