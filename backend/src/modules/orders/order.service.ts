import { ApiError } from "../../utils/ApiError";
import { sendNewOrderEmail } from "../../config/mailer";
import { locationRepository } from "../locations/location.repository";
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

/**
 * Orders whose subtotal reaches this amount (BDT) ship free, regardless of
 * delivery zone. Authoritative on the server — the storefront only mirrors it.
 */
export const FREE_DELIVERY_THRESHOLD = 3000;

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
 * Compose the stored address text for a manual order. When the admin picked a
 * division → district → upazila the chain is verified against the seeded
 * hierarchy (a mismatched pair is a client bug, not a valid address) and the
 * text is built from the canonical NAMES, so it reads the same as a storefront
 * order. Falls back to the typed address when no location was selected.
 */
async function resolveManualAddress(input: Omit<CreateManualOrderInput, "status">) {
  const { divisionId, districtId, upazilaId, area } = input;
  if (!divisionId || !districtId || !upazilaId || !area) {
    if (!input.address) throw ApiError.badRequest("A delivery address is required.");
    return input.address;
  }

  const [division, district, upazila] = await Promise.all([
    locationRepository.findDivisionById(divisionId),
    locationRepository.findDistrictById(districtId),
    locationRepository.findUpazilaById(upazilaId),
  ]);
  if (!division || !district || !upazila) throw ApiError.badRequest("Invalid delivery location.");
  if (district.divisionId !== division.id || upazila.districtId !== district.id) {
    throw ApiError.badRequest("The selected district / upazila does not belong to that division.");
  }

  return `${area}, ${upazila.name}, ${district.name}, ${division.name}`;
}

/**
 * Shared order builder: validates products, computes authoritative prices +
 * delivery, decrements stock, and inserts the order atomically. Stock never
 * blocks an order: whatever stock can cover ships as a regular line, and any
 * overflow becomes a separate PRE-ORDER line (isPreOrder = true) for the same
 * product — so requesting 10 with 5 in stock yields two order_items rows
 * (5 regular + 5 pre-order) and only the covered 5 are decremented.
 */
async function buildAndInsertOrder(
  input: Omit<CreateManualOrderInput, "status" | "address"> & { address: string },
  status: OrderStatus = "pending",
  userId: string | null = null
) {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const found = await orderRepository.findProductsByIds(productIds);
  const byId = new Map(found.map((p) => [p.id, p]));
  const mainImages = await orderRepository.findMainImagesByProductIds(productIds);

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
      productId: product.id,
      title: product.title,
      price: money(variant.unitPrice),
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

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const { fee: zoneFee, estimate } = DELIVERY[input.deliveryZone];
  // Free delivery once the subtotal reaches the threshold.
  const fee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : zoneFee;
  const total = subtotal + fee;

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
    const address = await resolveManualAddress(rest);
    return buildAndInsertOrder({ ...rest, address }, status ?? "confirmed");
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
