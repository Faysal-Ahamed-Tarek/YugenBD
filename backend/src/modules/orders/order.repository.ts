import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { orders, orderItems, products, productImages, productWeights } from "../../db/schema";
import type { ListOrdersQuery, OrderStatus } from "./order.validators";

type NewOrder = typeof orders.$inferInsert;
type NewOrderItem = typeof orderItems.$inferInsert;

/** A stock bucket to decrement: a specific weight row, or product-level. */
export interface StockDecrement {
  productId: string;
  weightId: string | null;
  quantity: number;
}

export const orderRepository = {
  /**
   * Look up the products referenced by an incoming order, with their weight
   * variants, for price/stock checks and per-weight decrements.
   */
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
      with: {
        weights: {
          columns: { id: true, value: true, unit: true, stock: true, price: true },
        },
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
   * Insert an order and its items atomically, and decrement stock in the SAME
   * transaction. Per-weight decrements hit product_weights.stock; product-level
   * decrements hit products.stock. GREATEST(..., 0) clamps at zero so stock can
   * never go negative even under a race. Returns the order with items.
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
        if (dec.weightId) {
          await tx
            .update(productWeights)
            .set({ stock: sql`GREATEST(${productWeights.stock} - ${dec.quantity}, 0)` })
            .where(eq(productWeights.id, dec.weightId));
        } else {
          await tx
            .update(products)
            .set({ stock: sql`GREATEST(${products.stock} - ${dec.quantity}, 0)` })
            .where(eq(products.id, dec.productId));
        }
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
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where),
    ]);

    return { rows, total: count };
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
};
