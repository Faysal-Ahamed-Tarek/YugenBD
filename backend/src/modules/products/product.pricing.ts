/**
 * Effective stock/price derivation for products — the SINGLE place that decides
 * how "in stock" and "price" are computed once weight variants enter the picture.
 *
 * A product with NO weight rows behaves as before: product-level `stock`,
 * `basePrice`, and `discountPrice` drive everything.
 *
 * A product WITH weight rows treats each weight as its own sellable variant:
 *   - effectiveStock  = SUM of every weight's stock (total sellable units)
 *   - effectivePrice  = the LOWEST weight price ("from ৳X" on cards)
 *   - effectiveDiscountPrice = null — weight prices are absolute, so there is no
 *     base-vs-discount strikethrough for weighted products.
 * The product-level base/discount price and stock are IGNORED for derivation in
 * that case (they stay in the row only as legacy/fallback values).
 */

interface WeightLike {
  stock: number;
  price: string | null;
}

interface ProductLike {
  stock: number;
  basePrice: string;
  discountPrice: string | null;
}

export interface EffectiveFields {
  hasWeights: boolean;
  effectiveStock: number;
  effectivePrice: string;
  effectiveDiscountPrice: string | null;
}

/** The paid unit price for a non-weighted product (discount when it undercuts base). */
function baseEffectivePrice(product: ProductLike): number {
  return product.discountPrice != null && Number(product.discountPrice) < Number(product.basePrice)
    ? Number(product.discountPrice)
    : Number(product.basePrice);
}

export function deriveEffective(product: ProductLike, weights: WeightLike[] | undefined): EffectiveFields {
  if (!weights || weights.length === 0) {
    return {
      hasWeights: false,
      effectiveStock: product.stock,
      effectivePrice: product.basePrice,
      effectiveDiscountPrice: product.discountPrice,
    };
  }

  const effectiveStock = weights.reduce((sum, w) => sum + w.stock, 0);
  // A weight missing a price (legacy row) falls back to the product price.
  const fallback = baseEffectivePrice(product);
  const lowest = Math.min(...weights.map((w) => (w.price != null ? Number(w.price) : fallback)));

  return {
    hasWeights: true,
    effectiveStock,
    effectivePrice: lowest.toFixed(2),
    effectiveDiscountPrice: null,
  };
}
