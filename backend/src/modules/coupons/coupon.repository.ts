import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { coupons } from "../../db/schema";

type NewCoupon = typeof coupons.$inferInsert;
/** A Drizzle transaction handle (the order insert passes its own). */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const couponRepository = {
  findAll() {
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  },

  findById(id: string) {
    return db.query.coupons.findFirst({ where: eq(coupons.id, id) });
  },

  /** `code` must already be upper-cased (validators normalise it). */
  findByCode(code: string) {
    return db.query.coupons.findFirst({ where: eq(coupons.code, code) });
  },

  create(values: NewCoupon) {
    return db.insert(coupons).values(values).returning().then((rows) => rows[0]);
  },

  update(id: string, values: Partial<NewCoupon>) {
    return db
      .update(coupons)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  remove(id: string) {
    return db.delete(coupons).where(eq(coupons.id, id)).returning().then((rows) => rows[0]);
  },

  /**
   * Atomically claim one use of a coupon inside the order transaction. The
   * WHERE re-checks active / date window / usage limit at UPDATE time, so two
   * concurrent checkouts can never push usedCount past usageLimit. Returns
   * false when the coupon is no longer redeemable (caller rolls back).
   */
  async redeem(tx: Tx, id: string) {
    const now = new Date();
    const rows = await tx
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(
        and(
          eq(coupons.id, id),
          eq(coupons.isActive, true),
          or(isNull(coupons.startsAt), lte(coupons.startsAt, now)),
          or(isNull(coupons.endsAt), gt(coupons.endsAt, now)),
          or(isNull(coupons.usageLimit), gt(coupons.usageLimit, coupons.usedCount))
        )
      )
      .returning({ id: coupons.id });
    return rows.length > 0;
  },
};
