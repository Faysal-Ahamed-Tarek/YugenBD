import { z } from "zod";
import { couponCodeSchema } from "../coupons/coupon.validators";

// Order-time phone capture uses the LOCAL Bangladeshi format 01XXXXXXXXX
// (exactly 11 digits, starts with 01). This is intentionally scoped to orders;
// the users/addresses schemas keep their own format.
const bdLocalPhone = /^01[3-9]\d{8}$/;

const orderItemSchema = z.object({
  productId: z.string().uuid("Invalid product id"),
  quantity: z.number().int().min(1).max(99),
});

export const createOrderSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name is too short").max(150),
    phone: z.string().trim().regex(bdLocalPhone, "Enter a valid Bangladeshi phone (01XXXXXXXXX)"),
    address: z.string().trim().min(5, "Please enter a full delivery address").max(1000),
    // Optional free-text note from the customer (delivery instructions, gift
    // message, etc). Never required.
    note: z.string().trim().max(1000, "Note is too long").optional(),
    deliveryZone: z.enum(["inside_dhaka", "outside_dhaka"]),
    // Payment: COD by default; bKash requires a manual Send Money reference
    // (transaction id + amount the customer typed). No gateway involved.
    paymentMethod: z.enum(["bkash", "cod"]).default("cod"),
    bkashTransactionId: z.string().trim().min(4, "Enter the bKash transaction ID").max(50).optional(),
    bkashAmount: z.number().positive("Enter the amount you sent").optional(),
    // Optional coupon. Only the CODE is accepted — the server re-validates it
    // and computes the discount itself; a client-sent amount is never trusted.
    couponCode: couponCodeSchema.optional(),
    items: z.array(orderItemSchema).min(1, "Your cart is empty"),
  })
  .refine((data) => data.paymentMethod !== "bkash" || !!data.bkashTransactionId, {
    message: "bKash transaction ID is required",
    path: ["bkashTransactionId"],
  })
  .refine((data) => data.paymentMethod !== "bkash" || data.bkashAmount != null, {
    message: "bKash amount is required",
    path: ["bkashAmount"],
  });

export const orderIdParamSchema = z.object({
  id: z.string().uuid("Invalid order id"),
});

const orderStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

// Off-catalogue line on a manual order: something the shop sells that isn't
// listed on the website. Admin types the name + unit price; it's stored as an
// order_items row with no product link and never touches stock.
const customItemSchema = z.object({
  title: z.string().trim().min(1, "Enter the product name").max(255),
  price: z.number().nonnegative("Price can't be negative").max(10_000_000),
  quantity: z.number().int().min(1).max(99),
});

// Manual admin orders: catalogue items and/or custom items (at least one line
// in total), a single free-text delivery address, plus an admin-set status.
export const createManualOrderSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name is too short").max(150),
    phone: z.string().trim().regex(bdLocalPhone, "Enter a valid Bangladeshi phone (01XXXXXXXXX)"),
    address: z.string().trim().min(5, "Please enter a full delivery address").max(1000),
    note: z.string().trim().max(1000, "Note is too long").optional(),
    deliveryZone: z.enum(["inside_dhaka", "outside_dhaka"]),
    // Admin-only per-order waiver: ship this one order free regardless of zone
    // or the global free-delivery settings. The zone is still required — it
    // drives the delivery estimate shown to the customer.
    freeDelivery: z.boolean().optional().default(false),
    // Admin-only flat discount (৳) off the item subtotal — never the delivery
    // fee. The service rejects a discount larger than the subtotal.
    discount: z.number().nonnegative("Discount can't be negative").max(10_000_000).optional().default(0),
    paymentMethod: z.enum(["bkash", "cod"]).default("cod"),
    bkashTransactionId: z.string().trim().min(4).max(50).optional(),
    bkashAmount: z.number().positive().optional(),
    items: z.array(orderItemSchema).default([]),
    customItems: z.array(customItemSchema).max(50).default([]),
    status: z.enum(orderStatuses).optional(),
  })
  .refine((data) => data.items.length + data.customItems.length > 0, {
    message: "Add at least one product",
    path: ["items"],
  })
  .refine((data) => data.paymentMethod !== "bkash" || !!data.bkashTransactionId, {
    message: "bKash transaction ID is required",
    path: ["bkashTransactionId"],
  })
  .refine((data) => data.paymentMethod !== "bkash" || data.bkashAmount != null, {
    message: "bKash amount is required",
    path: ["bkashAmount"],
  });

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatuses),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(["pending", "verified"]),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(16),
  q: z.string().trim().optional(),
  status: z.enum(orderStatuses).optional(),
});

export type OrderStatus = (typeof orderStatuses)[number];
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;
export type CustomOrderItem = z.infer<typeof customItemSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
