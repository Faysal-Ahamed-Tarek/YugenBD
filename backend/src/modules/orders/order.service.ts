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

/** Canonical weight label, matching the storefront/admin: `50ml`, `1.5kg`. */
function weightLabelOf(weight: { value: string; unit: string }) {
  return `${parseFloat(weight.value)}${weight.unit}`;
}

type ProductWithWeights = Awaited<ReturnType<typeof orderRepository.findProductsByIds>>[number];

/** Effective (paid) unit price for a product with no weight variants. */
function productPrice(product: { basePrice: string; discountPrice: string | null }) {
  return product.discountPrice != null && Number(product.discountPrice) < Number(product.basePrice)
    ? Number(product.discountPrice)
    : Number(product.basePrice);
}

/**
 * Resolve a submitted line item against the catalog, returning the
 * authoritative unit price, the stock bucket it draws from (product-level or a
 * specific weight row), and how many units are available.
 *
 * Weighted products track stock + price PER WEIGHT: the product-level stock and
 * base/discount price are ignored. A weight must be chosen for such products.
 */
function resolveVariant(
  product: ProductWithWeights,
  weightLabel: string | undefined
): { unitPrice: number; availableStock: number; weightId: string | null } {
  const weights = product.weights ?? [];

  if (weights.length > 0) {
    if (!weightLabel) {
      throw ApiError.badRequest(`Please choose a size for "${product.title}".`);
    }
    const match = weights.find((w) => weightLabelOf(w) === weightLabel);
    if (!match) {
      throw ApiError.badRequest(`"${weightLabel}" is not a valid size for "${product.title}".`);
    }
    const unitPrice = match.price != null ? Number(match.price) : productPrice(product);
    return { unitPrice, availableStock: match.stock, weightId: match.id };
  }

  return { unitPrice: productPrice(product), availableStock: product.stock, weightId: null };
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
  status: OrderStatus = "pending"
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
    const variant = resolveVariant(product, item.weightLabel);
    const bucketKey = `${product.id}::${variant.weightId ?? ""}`;
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
    weightLabel: item.weightLabel ?? null,
    quantity: item.quantity,
    isPreOrder: preOrderBuckets.has(bucketKey),
    lineTotal: variant.unitPrice * item.quantity,
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const { fee, estimate } = DELIVERY[input.deliveryZone];
  const total = subtotal + fee;

  const isBkash = input.paymentMethod === "bkash";

  // Stock decrements: skip pre-order buckets (stock already 0). One entry per
  // bucket with the total quantity to subtract.
  const decrements = [...requestedByBucket.entries()]
    .filter(([key]) => !preOrderBuckets.has(key))
    .map(([key, quantity]) => {
      const [productId, weightId] = key.split("::");
      return { productId, weightId: weightId || null, quantity };
    });

  return orderRepository.createWithItems(
    {
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
  create(input: CreateOrderInput) {
    return buildAndInsertOrder(input, "pending");
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
};
