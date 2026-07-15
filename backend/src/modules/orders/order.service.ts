import { ApiError } from "../../utils/ApiError";
import { orderRepository } from "./order.repository";
import type { CreateOrderInput, CreateManualOrderInput, ListOrdersQuery, OrderStatus } from "./order.validators";

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
 * delivery, decrements stock (per-weight when applicable), and inserts the
 * order atomically. Items whose available stock is exactly 0 are accepted as
 * PRE-ORDERS (isPreOrder = true, no decrement); items with 1..stock-1 that
 * exceed availability are rejected.
 */
async function buildAndInsertOrder(
  input: Omit<CreateManualOrderInput, "status">,
  status: OrderStatus = "pending",
  userId: string | null = null
) {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const found = await orderRepository.findProductsByIds(productIds);
  const byId = new Map(found.map((p) => [p.id, p]));
  const mainImages = await orderRepository.findMainImagesByProductIds(productIds);

  // Sum requested quantity per stock bucket (product or weight) so multiple
  // lines drawing on the same bucket are validated against the true total.
  const requestedByBucket = new Map<string, number>();

  const resolved = input.items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || product.status !== "published") {
      throw ApiError.badRequest(`A product in the order is no longer available.`);
    }
    const variant = { unitPrice: productPrice(product), availableStock: product.stock };
    const bucketKey = product.id;
    requestedByBucket.set(bucketKey, (requestedByBucket.get(bucketKey) ?? 0) + item.quantity);
    return { item, product, variant, bucketKey };
  });

  // Pre-order applies only when a bucket's stock is exactly 0. When stock is
  // >0 but less than the total requested for that bucket, reject.
  const preOrderBuckets = new Set<string>();
  for (const { product, variant, bucketKey } of resolved) {
    const requested = requestedByBucket.get(bucketKey)!;
    if (variant.availableStock === 0) {
      preOrderBuckets.add(bucketKey);
    } else if (requested > variant.availableStock) {
      throw ApiError.badRequest(`"${product.title}" only has ${variant.availableStock} left in stock.`);
    }
  }

  const lineItems = resolved.map(({ item, product, variant, bucketKey }) => ({
    productId: product.id,
    title: product.title,
    price: money(variant.unitPrice),
    imageUrl: mainImages.get(product.id) ?? null,
    quantity: item.quantity,
    isPreOrder: preOrderBuckets.has(bucketKey),
    lineTotal: variant.unitPrice * item.quantity,
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const { fee, estimate } = DELIVERY[input.deliveryZone];
  const total = subtotal + fee;

  const isBkash = input.paymentMethod === "bkash";

  // Stock decrements: skip pre-order buckets (stock already 0). One entry per
  // product with the total quantity to subtract.
  const decrements = [...requestedByBucket.entries()]
    .filter(([productId]) => !preOrderBuckets.has(productId))
    .map(([productId, quantity]) => ({ productId, quantity }));

  return orderRepository.createWithItems(
    {
      userId,
      fullName: input.fullName,
      phone: input.phone,
      address: input.address,
      deliveryZone: input.deliveryZone,
      deliveryFee: money(fee),
      deliveryEstimate: estimate,
      subtotal: money(subtotal),
      total: money(total),
      status,
      paymentMethod: input.paymentMethod,
      bkashTransactionId: isBkash ? input.bkashTransactionId ?? null : null,
      bkashAmount: isBkash && input.bkashAmount != null ? money(input.bkashAmount) : null,
      paymentStatus: "pending",
    },
    lineItems.map(({ lineTotal, ...item }) => item),
    decrements
  );
}

export const orderService = {
  // `userId` links the order to the logged-in customer (null for guests).
  create(input: CreateOrderInput, userId: string | null = null) {
    return buildAndInsertOrder(input, "pending", userId);
  },

  /** Order history for a logged-in customer, newest first. */
  listByUser(userId: string) {
    return orderRepository.findByUser(userId);
  },

  /** Admin manual order — same pricing integrity, plus an admin-set status. */
  createManual(input: CreateManualOrderInput) {
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
