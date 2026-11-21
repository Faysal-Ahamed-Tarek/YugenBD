import { z } from "zod";

export const couponTypes = ["percent", "fixed"] as const;

// Codes are normalised to upper case so lookups and the unique index are
// case-insensitive. Letters, digits, dash and underscore only.
export const couponCodeSchema = z
  .string()
  .trim()
  .min(3, "Coupon code must be at least 3 characters")
  .max(40, "Coupon code is too long")
  .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dashes or underscores only")
  .transform((v) => v.toUpperCase());

export const couponIdParamSchema = z.object({
  id: z.string().uuid("Invalid coupon id"),
});

const optionalMoney = z.number().positive().max(10_000_000).nullable().optional();
const optionalDate = z.coerce.date().nullable().optional();

const couponFields = z.object({
  code: couponCodeSchema,
  type: z.enum(couponTypes),
  value: z.number().positive("Value must be greater than 0").max(10_000_000),
  minSubtotal: optionalMoney,
  maxDiscount: optionalMoney,
  startsAt: optionalDate,
  endsAt: optionalDate,
  usageLimit: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

const percentMax = (d: { type?: string; value?: number }) =>
  d.type !== "percent" || d.value == null || d.value <= 100;
const datesOrdered = (d: { startsAt?: Date | null; endsAt?: Date | null }) =>
  !d.startsAt || !d.endsAt || d.endsAt > d.startsAt;

export const createCouponSchema = couponFields
  .refine(percentMax, { message: "A percent coupon can't exceed 100%", path: ["value"] })
  .refine(datesOrdered, { message: "End date must be after the start date", path: ["endsAt"] });

export const updateCouponSchema = couponFields
  .partial()
  .refine(percentMax, { message: "A percent coupon can't exceed 100%", path: ["value"] })
  .refine(datesOrdered, { message: "End date must be after the start date", path: ["endsAt"] });

// Public checkout preview. The subtotal is only used to show the customer a
// discount; POST /orders recomputes everything from DB prices.
export const validateCouponSchema = z.object({
  code: couponCodeSchema,
  subtotal: z.number().min(0).max(100_000_000),
});

export type CouponType = (typeof couponTypes)[number];
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
