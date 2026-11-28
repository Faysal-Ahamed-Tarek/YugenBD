import { ApiError } from "../../utils/ApiError";
import { sendNewOrderEmail } from "../../config/mailer";
import { deliveryService } from "../delivery/delivery.service";
import { couponService } from "../coupons/coupon.service";
import { orderRepository } from "./order.repository";
import type {
  CreateOrderInput,
  CreateManualOrderInput,
  CustomOrderItem,
  ListOrdersQuery,
  OrderStatus,
} from "./order.validators";

/**
 * Delivery pricing is authoritative on the server — never trust the client.
 * This is the SINGLE SOURCE OF TRUTH for delivery fees, used by both the
 * customer checkout (POST /orders) and admin manual orders (POST /orders/manual).
 * The frontend/admin only mirror these numbers for display.
 */
const DELIVERY = {
  inside_dhaka: { fee: 70, estimate: "1-2 days" },
  outside_dhaka: { fee: 120, estimate: "2-3 days" },
} as const;

/**
 * Free delivery is admin-configurable (delivery module): orders whose subtotal
 * reaches the saved threshold ship free regardless of zone, and an "always
 * free" toggle waives the fee outright — but that toggle is a MEMBER PERK: it
 * only applies to orders placed by a signed-in customer (userId != null).
 * Guests (and manual orders, which have no account) keep paying the zone fee
 * until the subtotal threshold is met. Authoritative on the server — the
 * storefront only mirrors these values for display.
 */

function money(value: number) {
  return value.toFixed(2);
}

/** Effective (paid) unit price: discount when it undercuts base, else base. */
function productPrice(product: { basePrice: string; discountPrice: string | null }) {
  return product.discountPrice != null && Number(product.discountPrice) < Number(product.basePrice)
    ? Number(product.discountPrice)
    : Number(product.basePrice);
}

/**
 * Shared order builder: validates products, computes authoritative prices +
 * delivery, decrements stock, and inserts the order atomically. Stock never
 * blocks an order: whatever stock can cover ships as a regular line, and any
 * overflow becomes a separate PRE-ORDER line (isPreOrder = true) for the same
 * product — so requesting 10 with 5 in stock yields two order_items rows
 * (5 regular + 5 pre-order) and only the covered 5 are decremented.
 *
 * `customItems` (manual orders only) are off-catalogue lines priced by the
 * admin: no product link, no image, no stock involvement.
 */
async function buildAndInsertOrder(
  // `freeDelivery` only ever arrives on manual orders — customer checkout never
  // sets it, so it stays optional here.
  input: Omit<CreateManualOrderInput, "status" | "freeDelivery" | "customItems" | "discount"> & {
    freeDelivery?: boolean;
    // Flat admin discount (manual orders only); customer checkout never sets it.
    discount?: number;
    customItems?: CustomOrderItem[];
  },
  status: OrderStatus = "pending",
  userId: string | null = null
) {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  // A manual order may be custom lines only — skip the catalogue lookups then.
  const [found, mainImages] =
    productIds.length > 0
      ? await Promise.all([
          orderRepository.findProductsByIds(productIds),
          orderRepository.findMainImagesByProductIds(productIds),
        ])
      : [[], new Map<string, string>()];
  const byId = new Map(found.map((p) => [p.id, p]));

  const resolved = input.items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || product.status !== "published") {
      throw ApiError.badRequest(`A product in the order is no longer available.`);
    }
    const variant = { unitPrice: productPrice(product), availableStock: product.stock };
    return { item, product, variant, bucketKey: product.id };
  });

  // Allocate available stock per bucket in line order; whatever a line can't
  // cover from stock is split off into its own pre-order line.
  const remainingByBucket = new Map<string, number>();
  for (const { variant, bucketKey } of resolved) {
    if (!remainingByBucket.has(bucketKey)) remainingByBucket.set(bucketKey, variant.availableStock);
  }

  const lineItems = resolved.flatMap(({ item, product, variant, bucketKey }) => {
    const remaining = remainingByBucket.get(bucketKey)!;
    const inStockQty = Math.min(item.quantity, remaining);
    const preOrderQty = item.quantity - inStockQty;
    remainingByBucket.set(bucketKey, remaining - inStockQty);

    const base = {
      // Widened so custom (off-catalogue) lines can join this list with no product.
      productId: product.id as string | null,
      title: product.title,
      price: money(variant.unitPrice),
      // Widened to null for custom lines, which have no regular price.
      regularPrice: money(Number(product.basePrice)) as string | null,
      imageUrl: mainImages.get(product.id) ?? null,
    };
    const lines = [];
    if (inStockQty > 0) {
      lines.push({ ...base, quantity: inStockQty, isPreOrder: false, lineTotal: variant.unitPrice * inStockQty });
    }
    if (preOrderQty > 0) {
      lines.push({ ...base, quantity: preOrderQty, isPreOrder: true, lineTotal: variant.unitPrice * preOrderQty });
    }
    return lines;
  });

  for (const custom of input.customItems ?? []) {
    lineItems.push({
      productId: null,
      title: custom.title,
      price: money(custom.price),
      regularPrice: null,
      imageUrl: null,
      quantity: custom.quantity,
      isPreOrder: false,
      lineTotal: custom.price * custom.quantity,
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const { fee: zoneFee, estimate } = DELIVERY[input.deliveryZone];
  // Free delivery when the admin waived it on this order (manual orders only),
  // when the "always free" perk applies (signed-in customers only), or once the
  // subtotal reaches the admin-set threshold (everyone, guests included).
  const { freeDeliveryThreshold, alwaysFree } = await deliveryService.resolve();
  const fee =
    input.freeDelivery || (alwaysFree && userId !== null) || subtotal >= freeDeliveryThreshold
      ? 0
      : zoneFee;

  // Coupon: re-validated and priced on the server from the authoritative
  // subtotal. It discounts the ITEMS only — the delivery fee is never
  // discounted, and the free-delivery threshold above is judged on the
  // pre-discount subtotal (a coupon never makes delivery cost money).
  const applied = input.couponCode ? await couponService.resolveForOrder(input.couponCode, subtotal) : null;
  const couponDiscount = applied?.discount ?? 0;
  // Manual orders may also carry an admin-typed flat discount, on top of any
  // coupon (same rule: items only, judged after the free-delivery decision).
  // Together they can never exceed the item subtotal.
  const manualDiscount = Math.round((input.discount ?? 0) * 100) / 100;
  if (couponDiscount + manualDiscount > subtotal) {
    throw ApiError.badRequest(
      couponDiscount > 0
        ? "Discount plus coupon can't be more than the product subtotal."
        : "Discount can't be more than the product subtotal."
    );
  }
  const discount = couponDiscount + manualDiscount;
  const total = subtotal - discount + fee;

  const isBkash = input.paymentMethod === "bkash";

  // Stock decrements: only the covered (non-pre-order) quantity per product —
  // initial stock minus whatever allocation is left.
  const decrements = [...remainingByBucket.entries()]
    .map(([productId, remaining]) => ({
      productId,
      quantity: byId.get(productId)!.stock - remaining,
    }))
    .filter((d) => d.quantity > 0);

  return orderRepository.createWithItems(
    {
      userId,
      fullName: input.fullName,
      phone: input.phone,
      address: input.address,
      note: input.note?.trim() || null,
      deliveryZone: input.deliveryZone,
      deliveryFee: money(fee),
      deliveryEstimate: estimate,
      subtotal: money(subtotal),
      couponCode: applied?.coupon.code ?? null,
      couponDiscount: applied ? money(couponDiscount) : null,
      discount: money(discount),
      total: money(total),
      status,
      paymentMethod: input.paymentMethod,
      bkashTransactionId: isBkash ? input.bkashTransactionId ?? null : null,
      bkashAmount: isBkash && input.bkashAmount != null ? money(input.bkashAmount) : null,
      paymentStatus: "pending",
    },
    lineItems.map(({ lineTotal, ...item }) => item),
    decrements,
    applied?.coupon.id ?? null
  );
}

export const orderService = {
  // `userId` links the order to the logged-in customer (null for guests).
  async create(input: CreateOrderInput, userId: string | null = null) {
    const order = await buildAndInsertOrder(input, "pending", userId);
    // Notify the shop inbox. Deliberately NOT awaited: sendNewOrderEmail never
    // throws (the mailer swallows failures), and checkout must not wait on SMTP.
    void sendNewOrderEmail(order);
    return order;
  },

  /** Order history for a logged-in customer, newest first. */
  listByUser(userId: string) {
    return orderRepository.findByUser(userId);
  },

  /** Admin manual order — same pricing integrity, plus an admin-set status. */
  async createManual(input: CreateManualOrderInput) {
    const { status, ...rest } = input;
    return buildAndInsertOrder(rest, status ?? "confirmed");
  },

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw ApiError.notFound("Order not found");
    return order;
  },

  async list(query: ListOrdersQuery) {
    const { rows, total } = await orderRepository.findMany(query);
    return {
      items: rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasMore: query.page * query.limit < total,
      },
    };
  },

  /**
   * Counts per order status, zero-filled for statuses with no rows, plus a
   * total. The admin polls this for the "pending orders" badge.
   */
  async counts() {
    const rows = await orderRepository.countByStatus();
    const byStatus: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = row.count;
      total += row.count;
    }
    return { ...byStatus, total };
  },

  async updateStatus(id: string, status: OrderStatus) {
    const updated = await orderRepository.updateStatus(id, status);
    if (!updated) throw ApiError.notFound("Order not found");
    return updated;
  },

  async updatePaymentStatus(id: string, paymentStatus: "pending" | "verified") {
    const updated = await orderRepository.updatePaymentStatus(id, paymentStatus);
    if (!updated) throw ApiError.notFound("Order not found");
    return updated;
  },

  /** Permanently delete an order (and its items via cascade). Admin only. */
  async remove(id: string) {
    const deleted = await orderRepository.deleteById(id);
    if (!deleted) throw ApiError.notFound("Order not found");
    return deleted;
  },
};
