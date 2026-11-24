import { and, asc, eq, lt, ne, sql, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { orderItems, orders, products, productImages } from "../../db/schema";

/** How many rows each dashboard panel returns (the admin renders all of them). */
const PANEL_LIMIT = 20;

/** A product is "low inventory" below this stock level. */
const LOW_STOCK_THRESHOLD = 10;

export const dashboardRepository = {
  /**
   * Total sales: sum of order totals (incl. delivery fee, after discount)
   * across every order that isn't cancelled — the same rule Top Selling uses.
   */
  async totalSales() {
    const [row] = await db
      .select({
        amount: sql<string>`coalesce(sum(${orders.total}), 0)::numeric(12,2)::text`,
        orders: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(ne(orders.status, "cancelled"));
    return row;
  },

  /**
   * Top products by total quantity sold across order_items, excluding
   * cancelled orders. Joins current product to fetch title + main image;
   * revenue is summed from the snapshotted line price × quantity.
   */
  async topSelling() {
    const rows = await db
      .select({
        productId: orderItems.productId,
        title: sql<string>`max(${orderItems.title})`,
        unitsSold: sql<number>`sum(${orderItems.quantity})::int`,
        revenue: sql<string>`sum(${orderItems.price} * ${orderItems.quantity})`,
        imageUrl: sql<string | null>`max(${productImages.imageUrl})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(
        productImages,
        and(eq(productImages.productId, orderItems.productId), eq(productImages.isMain, true))
      )
      .where(ne(orders.status, "cancelled"))
      // Lines with no product link (custom manual-order items, or products
      // since deleted) are grouped by their title instead of all collapsing
      // into one NULL bucket.
      .groupBy(orderItems.productId, sql`case when ${orderItems.productId} is null then ${orderItems.title} end`)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(PANEL_LIMIT);

    return rows.map((r) => ({
      productId: r.productId,
      title: r.title,
      unitsSold: r.unitsSold,
      revenue: r.revenue,
      imageUrl: r.imageUrl,
    }));
  },

  /** Published products below the low-stock threshold, lowest stock first. */
  lowStock() {
    return db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        stock: products.stock,
        imageUrl: productImages.imageUrl,
      })
      .from(products)
      // Join rather than a correlated sql`` subquery: inside a raw subquery
      // Drizzle renders interpolated columns UNQUALIFIED, so the correlation
      // silently became `product_images.product_id = product_images.id` and
      // every row came back with a null image. setMainImage keeps at most one
      // main image per product, so this can't duplicate rows.
      .leftJoin(
        productImages,
        and(eq(productImages.productId, products.id), eq(productImages.isMain, true))
      )
      .where(and(lt(products.stock, LOW_STOCK_THRESHOLD), eq(products.status, "published")))
      .orderBy(asc(products.stock))
      .limit(PANEL_LIMIT);
  },
};
