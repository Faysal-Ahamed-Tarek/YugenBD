"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { addToCart } from "@/lib/cart";

export default function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  const paidPrice =
    product.discountPrice != null && parseFloat(product.discountPrice) < parseFloat(product.basePrice)
      ? product.discountPrice
      : product.basePrice;
  // Zero stock is a PRE-ORDER (still orderable), not a hard block.
  const isPreOrder = product.stock <= 0;

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: paidPrice,
      imageUrl: product.mainImage?.imageUrl ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const label = added ? "Added ✓" : isPreOrder ? "Pre-Order" : "Add to Cart";

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
