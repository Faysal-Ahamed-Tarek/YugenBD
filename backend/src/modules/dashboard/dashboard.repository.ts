import { and, asc, eq, lt, ne, sql, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { orderItems, orders, products, productImages } from "../../db/schema";

export const dashboardRepository = {
  /**
   * Top 10 products by total quantity sold across order_items, excluding
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
      .groupBy(orderItems.productId)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(10);

    return rows.map((r) => ({
      productId: r.productId,
      title: r.title,
      unitsSold: r.unitsSold,
      revenue: r.revenue,
      imageUrl: r.imageUrl,
    }));
  },

  /** Published products with stock < 10, lowest stock first. */
  lowStock() {
    return db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        stock: products.stock,
        imageUrl: sql<string | null>`(
          select ${productImages.imageUrl} from ${productImages}
          where ${productImages.productId} = ${products.id} and ${productImages.isMain} = true
          limit 1
        )`,
      })
      .from(products)
      .where(and(lt(products.stock, 10), eq(products.status, "published")))
      .orderBy(asc(products.stock))
      .limit(50);
  },
};
