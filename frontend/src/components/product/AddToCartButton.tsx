"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/types";
import { resolveEffective } from "@/lib/product";
import { addToCart } from "@/lib/cart";

export default function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const router = useRouter();

  const { hasWeights, effectiveStock, effectivePrice, effectiveDiscountPrice } =
    resolveEffective(product);
  // Weighted products need a size chosen — send the shopper to the detail page
  // rather than adding an ambiguous line the checkout would reject.
  const needsOptions = hasWeights;
  // Zero effective stock is a PRE-ORDER (still orderable), not a hard block.
  const isPreOrder = effectiveStock <= 0;

  const handleAdd = () => {
    if (needsOptions) {
      router.push(`/product/${product.slug}`);
      return;
    }
    addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: effectiveDiscountPrice ?? effectivePrice,
      imageUrl: product.mainImage?.imageUrl ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const label = needsOptions
    ? "Choose Options"
    : added
      ? "Added ✓"
      : isPreOrder
        ? "Pre-Order"
        : "Add to Cart";

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`${label} — ${product.title}`}
      className={`w-full rounded-full py-2 text-sm font-semibold transition-colors ${
        added ? "bg-green-600 text-white" : "bg-primary text-white hover:bg-primary-dark"
      }`}
    >
      {label}
    </button>
  );
}
