import { ApiError } from "../../utils/ApiError";
import { couponRepository } from "./coupon.repository";
import type { CreateCouponInput, UpdateCouponInput } from "./coupon.validators";

type Coupon = NonNullable<Awaited<ReturnType<typeof couponRepository.findById>>>;

const money = (n: number | null | undefined) => (n == null ? n : n.toFixed(2));

/** Map validated input to DB values (money → numeric strings). */
function toRow<T extends Partial<CreateCouponInput>>(input: T) {
  const { value, minSubtotal, maxDiscount, ...rest } = input;
  return {
    ...rest,
    ...(value !== undefined ? { value: money(value)! } : {}),
    ...(minSubtotal !== undefined ? { minSubtotal: money(minSubtotal) } : {}),
    ...(maxDiscount !== undefined ? { maxDiscount: money(maxDiscount) } : {}),
  };
}

/** Postgres unique violation (coupons_code_idx). Drizzle wraps the pg error in `cause`. */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; cause?: unknown };
  return e.code === "23505" || isUniqueViolation(e.cause);
}

/**
 * Checks a coupon is redeemable right now for an item subtotal and returns the
 * discount in whole taka. Throws a customer-readable 400 otherwise. This is the
 * SINGLE SOURCE OF TRUTH for coupon maths — the checkout preview and the order
 * builder both call it.
 *
 * Decision: coupons discount the ITEM SUBTOTAL only. The delivery fee is never
 * discounted, and the discount can't exceed the subtotal.
 */
function computeDiscount(coupon: Coupon | undefined | null, subtotal: number, now = new Date()) {
  const invalid = () => ApiError.badRequest("This coupon code is not valid.");
  if (!coupon || !coupon.isActive) throw invalid();
  if (coupon.startsAt && coupon.startsAt > now) throw ApiError.badRequest("This coupon is not active yet.");
  if (coupon.endsAt && coupon.endsAt <= now) throw ApiError.badRequest("This coupon has expired.");
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest("This coupon has reached its usage limit.");
  }
  const min = coupon.minSubtotal != null ? Number(coupon.minSubtotal) : 0;
  if (subtotal < min) {
    throw ApiError.badRequest(`Add ৳${Math.ceil(min - subtotal).toLocaleString("en-US")} more to use this coupon.`);
  }

  const value = Number(coupon.value);
  let discount = coupon.type === "percent" ? (subtotal * value) / 100 : value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, Number(coupon.maxDiscount));
  // Whole taka (prices display without decimals), never more than the items.
  discount = Math.min(Math.round(discount), subtotal);
  return discount;
}

export const couponService = {
  list() {
    return couponRepository.findAll();
  },

  async getById(id: string) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw ApiError.notFound("Coupon not found");
    return coupon;
  },

  async create(input: CreateCouponInput) {
    try {
      return await couponRepository.create({ ...toRow(input), code: input.code, type: input.type, value: input.value.toFixed(2) });
    } catch (err) {
      if (isUniqueViolation(err)) throw ApiError.conflict("A coupon with this code already exists.");
      throw err;
    }
  },

  async update(id: string, input: UpdateCouponInput) {
    const existing = await this.getById(id);
    // Cross-field checks against the stored row for partial updates.
    const type = input.type ?? existing.type;
    const value = input.value ?? Number(existing.value);
    if (type === "percent" && value > 100) throw ApiError.badRequest("A percent coupon can't exceed 100%");
    const startsAt = input.startsAt !== undefined ? input.startsAt : existing.startsAt;
    const endsAt = input.endsAt !== undefined ? input.endsAt : existing.endsAt;
    if (startsAt && endsAt && endsAt <= startsAt) throw ApiError.badRequest("End date must be after the start date");
    try {
      return await couponRepository.update(id, toRow(input));
    } catch (err) {
      if (isUniqueViolation(err)) throw ApiError.conflict("A coupon with this code already exists.");
      throw err;
    }
  },

  async remove(id: string) {
    await this.getById(id);
    return couponRepository.remove(id);
  },

  /** Public checkout preview: { code, type, value, discount } for a subtotal. */
  async validate(code: string, subtotal: number) {
    const coupon = await couponRepository.findByCode(code);
    const discount = computeDiscount(coupon, subtotal);
    return { code: coupon!.code, type: coupon!.type, value: coupon!.value, discount: money(discount)! };
  },

  /**
   * Order-time resolution: the coupon row (for the atomic redeem) plus the
   * server-computed discount. Used by orderService — never trusts the client.
   */
  async resolveForOrder(code: string, subtotal: number) {
    const coupon = await couponRepository.findByCode(code);
    const discount = computeDiscount(coupon, subtotal);
    return { coupon: coupon!, discount };
  },
};
