import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { orders, orderItems, products, productImages, users } from "../../db/schema";
import type { ListOrdersQuery, OrderStatus } from "./order.validators";

type NewOrder = typeof orders.$inferInsert;
type NewOrderItem = typeof orderItems.$inferInsert;

/** A product-level stock decrement. */
export interface StockDecrement {
  productId: string;
  quantity: number;
}

export const orderRepository = {
  /** Look up the products referenced by an incoming order for price/stock checks. */
  findProductsByIds(ids: string[]) {
    return db.query.products.findMany({
      where: inArray(products.id, ids),
      columns: {
        id: true,
        title: true,
        status: true,
        stock: true,
        basePrice: true,
        discountPrice: true,
      },
    });
  },

  /** Main image URL per product, for snapshotting into order items. */
  async findMainImagesByProductIds(ids: string[]) {
    const rows = await db
      .select({ productId: productImages.productId, imageUrl: productImages.imageUrl })
      .from(productImages)
      .where(and(inArray(productImages.productId, ids), eq(productImages.isMain, true)));
    return new Map(rows.map((r) => [r.productId, r.imageUrl]));
  },

  /**
   * Insert an order and its items atomically, and decrement product stock in the
   * SAME transaction. GREATEST(..., 0) clamps at zero so stock can never go
   * negative even under a race. Returns the order with items.
   */
  async createWithItems(
    order: NewOrder,
    items: Omit<NewOrderItem, "orderId">[],
    decrements: StockDecrement[] = []
  ) {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(orders).values(order).returning();
      const rows = await tx
        .insert(orderItems)
        .values(items.map((item) => ({ ...item, orderId: created.id })))
        .returning();

      for (const dec of decrements) {
        await tx
          .update(products)
          .set({ stock: sql`GREATEST(${products.stock} - ${dec.quantity}, 0)` })
          .where(eq(products.id, dec.productId));
      }

      return { ...created, items: rows };
    });
  },

  async findById(id: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: { orderBy: asc(orderItems.title) },
      },
    });
    return order ?? null;
  },

  /**
   * All orders belonging to a user, newest first, with their items. Matches
   * both orders linked by userId AND orders placed with the account's phone
   * number (e.g. guest checkouts made before signing in), so the customer's
   * history is complete.
   */
  findByUser(userId: string) {
    const userPhone = db.select({ phone: users.phone }).from(users).where(eq(users.id, userId));
    return db.query.orders.findMany({
      where: or(eq(orders.userId, userId), inArray(orders.phone, userPhone)),
      orderBy: desc(orders.createdAt),
      with: { items: { orderBy: asc(orderItems.title) } },
    });
  },

  /** Admin list: search by customer name/phone, filter by status, paginated, newest first. */
  async findMany(query: ListOrdersQuery) {
    const conditions = [];
    if (query.q) {
      conditions.push(or(ilike(orders.fullName, `%${query.q}%`), ilike(orders.phone, `%${query.q}%`)));
    }
    if (query.status) {
      conditions.push(eq(orders.status, query.status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.limit;

    const [rows, [{ count }]] = await Promise.all([
      db.query.orders.findMany({
        where,
        orderBy: desc(orders.createdAt),
        limit: query.limit,
        offset,
        with: { items: { orderBy: asc(orderItems.title) } },
        // Does this order's phone belong to a registered account? Drives the
        // Account column in the admin list. Matched on phone (not userId) so
        // guest checkouts by an existing customer still count as registered.
        //
        // The users side is written as raw SQL with its own alias `u`: inside
        // `extras` the relational query builder rewrites interpolated column
        // objects to the OUTER table's alias, which silently turned
        // `users.phone = orders.phone` into `orders.phone = orders.phone`
        // (always true). Only ${orders.phone} may be interpolated here.
        extras: {
          hasAccount: sql<boolean>`exists (
            select 1 from "users" u where u."phone" = ${orders.phone}
          )`.as("has_account"),
        },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where),
    ]);

    return { rows, total: count };
  },

  /** Order count per status (admin badge / tab counters). */
  async countByStatus() {
    const rows = await db
      .select({ status: orders.status, count: sql<number>`count(*)::int` })
      .from(orders)
      .groupBy(orders.status);
    return rows;
  },

  updateStatus(id: string, status: OrderStatus) {
    return db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning()
      .then((rows) => rows[0] ?? null);
  },

  updatePaymentStatus(id: string, paymentStatus: "pending" | "verified") {
    return db
      .update(orders)
      .set({ paymentStatus })
      .where(eq(orders.id, id))
      .returning()
      .then((rows) => rows[0] ?? null);
  },

  /**
   * Permanently delete an order. Its order_items are removed automatically by
   * the ON DELETE CASCADE FK. Returns the deleted id, or null when not found.
   */
  deleteById(id: string) {
    return db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning({ id: orders.id })
      .then((rows) => rows[0] ?? null);
  },
};
