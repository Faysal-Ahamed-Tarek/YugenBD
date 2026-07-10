"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ProductDetail, ProductWeight } from "@/types";
import { formatPrice } from "@/lib/format";
import { resolveEffective } from "@/lib/product";
import { addToCart } from "@/lib/cart";

const WHATSAPP_NUMBER = "8801700000000"; // hotline number without "+"

const weightLabelOf = (w: Pick<ProductWeight, "value" | "unit">) => `${parseFloat(w.value)}${w.unit}`;

/**
 * Quantity selector + purchase actions. "Order Now" adds the chosen quantity to
 * the cart and heads to /cart; WhatsApp opens a prefilled chat.
 *
 * Pricing/stock are weight-aware (Part 2): when the product has weight variants,
 * the chosen weight's own price + stock apply. Zero available stock does NOT
 * disable ordering — it becomes a PRE-ORDER (Part 3c): the button stays enabled
 * with a "Pre-Order" label and an out-of-stock note.
 */
export default function ProductActions({ product }: { product: ProductDetail }) {
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();

  const weights = product.weights ?? [];
  const hasWeights = weights.length > 0;
  const [selectedWeight, setSelectedWeight] = useState<string | null>(null);
  const needsWeight = hasWeights && !selectedWeight;

  const selected = useMemo(
    () => (selectedWeight ? weights.find((w) => weightLabelOf(w) === selectedWeight) ?? null : null),
    [selectedWeight, weights]
  );

  // Safe effective price/stock (falls back to base fields on older responses).
  const { effectivePrice, effectiveDiscountPrice, effectiveStock } = resolveEffective(product);
  const basePaidPrice = effectiveDiscountPrice ?? effectivePrice;

  // Resolve the active variant's price + stock.
  const unitPrice = hasWeights
    ? selected?.price != null
      ? selected.price
      : basePaidPrice
    : basePaidPrice;
  const availableStock = hasWeights ? selected?.stock ?? 0 : effectiveStock;

  // Pre-order once a concrete variant is known and its stock is exactly 0.
  const isPreOrder = !needsWeight && availableStock === 0;
  // Cap quantity at stock when in stock; pre-orders have no stock cap.
  const maxQty = availableStock > 0 ? availableStock : 99;

  const changeQuantity = (delta: number) => {
    setQuantity((q) => Math.min(Math.max(1, q + delta), maxQty));
  };

  const orderNow = () => {
    if (needsWeight) return;
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        price: unitPrice,
        imageUrl: product.images.find((img) => img.isMain)?.imageUrl ?? product.images[0]?.imageUrl ?? null,
        weightLabel: selectedWeight,
      },
      quantity
    );
    router.push("/cart");
  };

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi! I want to order: ${product.title}${selectedWeight ? ` (${selectedWeight})` : ""} (qty ${quantity})`
  )}`;

  return (
    <div>
      {/* Weight / size selector (required when the product has variants) */}
      {hasWeights && (
        <div className="mb-4">
          <p className="text-sm font-semibold mb-2">
            Size {needsWeight && <span className="text-primary font-normal">· please select</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {weights.map((w) => {
              const label = weightLabelOf(w);
              const active = selectedWeight === label;
              const soldOut = w.stock === 0;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWeight(label);
                    setQuantity(1);
                  }}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {label}
                  {soldOut && <span className={active ? "text-white/80" : "text-muted"}> · pre-order</span>}
                </button>
              );
            })}
          </div>
          {selected && (
            <p className="mt-2 text-sm">
              <span className="font-semibold text-foreground">{formatPrice(unitPrice)}</span>
            </p>
          )}
        </div>
      )}

      {/* Pre-order notice */}
      {isPreOrder && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary-light px-3 py-2.5 text-sm text-primary">
          Currently out of stock — order now and we&apos;ll ship it as soon as it&apos;s restocked.
        </div>
      )}

      <p className="text-sm font-semibold mb-2">Quantity</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Quantity box */}
        <div className="inline-flex h-12 items-center rounded-full border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => changeQuantity(-1)}
            disabled={quantity <= 1}
            className="h-12 w-12 text-xl text-muted hover:text-primary disabled:opacity-40 transition-colors"
          >
            −
          </button>
          <span aria-live="polite" className="w-12 text-center text-base font-semibold">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => changeQuantity(1)}
            disabled={quantity >= maxQty}
            className="h-12 w-12 text-xl text-muted hover:text-primary disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </div>

        {/* Primary: Order Now / Pre-Order */}
        <button
          type="button"
          onClick={orderNow}
          disabled={needsWeight}
          className="h-12 flex-1 rounded-full bg-primary px-8 text-base font-semibold text-white hover:bg-primary-dark disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed transition-colors"
        >
          {needsWeight ? "Select a size" : isPreOrder ? "Pre-Order" : "Order Now"}
        </button>
      </div>

      {/* Secondary: WhatsApp */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-base font-semibold text-white hover:brightness-95 transition"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.3.2-.5s0-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4a15 15 0 0 0 1.5.6c.6.2 1.2.2 1.7.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.4z" />
        </svg>
        Order on WhatsApp
      </a>

      {/* Delivery / payment badges */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5 text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-primary">
            <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
            <circle cx="7" cy="17" r="1.6" />
            <circle cx="17" cy="17" r="1.6" />
          </svg>
          Delivery in 2–4 business days across Bangladesh
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5 text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-primary">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
          Cash on Delivery — pay when you receive
        </div>
      </div>
    </div>
  );
}
