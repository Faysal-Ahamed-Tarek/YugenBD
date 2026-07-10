import type { Product, ProductDetail } from "@/types";

/**
 * Resolve a product's effective (weight-aware) stock + price, tolerating
 * responses that predate the effective fields (older backend, or a stale ISR
 * cache served mid-deploy). When the fields are absent we fall back to the
 * product-level base price / discount / stock so the UI never crashes.
 *
 * See product.pricing on the backend for how these are computed there.
 */
export function resolveEffective(product: Product | ProductDetail) {
  return {
    hasWeights: product.hasWeights ?? false,
    effectiveStock: product.effectiveStock ?? product.stock,
    effectivePrice: product.effectivePrice ?? product.basePrice,
    effectiveDiscountPrice:
      product.effectiveDiscountPrice !== undefined
        ? product.effectiveDiscountPrice
        : product.discountPrice,
  };
}
