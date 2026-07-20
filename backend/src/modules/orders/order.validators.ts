import { z } from "zod";

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
    deliveryZone: z.enum(["inside_dhaka", "outside_dhaka"]),
    // Payment: COD by default; bKash requires a manual Send Money reference
    // (transaction id + amount the customer typed). No gateway involved.
    paymentMethod: z.enum(["bkash", "cod"]).default("cod"),
    bkashTransactionId: z.string().trim().min(4, "Enter the bKash transaction ID").max(50).optional(),
    bkashAmount: z.number().positive("Enter the amount you sent").optional(),
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

// Manual admin orders reuse the customer schema plus an optional status. The
// base schema is a ZodEffects (from .refine), so extend the inner object.
//
// The admin form collects the customer's location the same way the storefront
// does — division → district → upazila from the seeded hierarchy, plus a typed
// area/street line. When those ids are sent the service composes the stored
// `address` text from the location NAMES, so admins never free-type them.
// `address` alone still works for orders captured without a location.
export const createManualOrderSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name is too short").max(150),
    phone: z.string().trim().regex(bdLocalPhone, "Enter a valid Bangladeshi phone (01XXXXXXXXX)"),
    address: z.string().trim().min(5, "Please enter a full delivery address").max(1000).optional(),
    divisionId: z.string().uuid("Select a division").optional(),
    districtId: z.string().uuid("Select a district").optional(),
    upazilaId: z.string().uuid("Select an upazila / thana").optional(),
    area: z.string().trim().min(3, "Enter the area / street address").max(255).optional(),
    deliveryZone: z.enum(["inside_dhaka", "outside_dhaka"]),
    paymentMethod: z.enum(["bkash", "cod"]).default("cod"),
    bkashTransactionId: z.string().trim().min(4).max(50).optional(),
    bkashAmount: z.number().positive().optional(),
    items: z.array(orderItemSchema).min(1, "Add at least one product"),
    status: z.enum(orderStatuses).optional(),
  })
  // Either the full location chain (+ area) or a plain address must be present.
  .refine(
    (data) =>
      Boolean(data.divisionId && data.districtId && data.upazilaId && data.area) || Boolean(data.address),
    {
      message: "Select division, district and upazila / thana, and enter the area",
      path: ["area"],
    }
  )
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
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
