"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductDetail } from "@/types";
import { addToCart } from "@/lib/cart";

// WhatsApp order number in international format (no "+"). Local 01924415506 → 880…
const WHATSAPP_NUMBER = "8801924415506";

/**
 * Quantity selector + purchase actions. "Order Now" adds the chosen quantity to
 * the cart and heads to /cart; WhatsApp opens a prefilled chat.
 *
 * Zero available stock does NOT disable ordering — it becomes a PRE-ORDER: the
 * button stays enabled with a "Pre-Order" label and an out-of-stock note.
 */
export default function ProductActions({
  product,
  shipmentDate,
}: {
  product: ProductDetail;
  /** Admin-set next shipment date (YYYY-MM-DD, from GET /shipment), or null if never configured. */
  shipmentDate?: string | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();

  const unitPrice =
    product.discountPrice != null && parseFloat(product.discountPrice) < parseFloat(product.basePrice)
      ? product.discountPrice
      : product.basePrice;
  const availableStock = product.stock;

  const isPreOrder = availableStock === 0;
  // Stock never limits the quantity: anything beyond what stock covers is
  // taken as a pre-order (the cart/order split the line automatically).
  const maxQty = 99;

  const changeQuantity = (delta: number) => {
    setQuantity((q) => Math.min(Math.max(1, q + delta), maxQty));
  };

  // Expected ship date shown for pre-orders: the admin-set shipment date
  // (GET /shipment) when configured, otherwise a 15-days-from-today guess.
  // shipmentDate is a plain YYYY-MM-DD (no time/timezone) — parsed as local
  // calendar date components so it always displays the date the admin picked.
  const restockDate = (() => {
    if (shipmentDate) {
      const [year, month, day] = shipmentDate.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  })();

  const orderNow = () => {
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        price: unitPrice,
        imageUrl: product.images.find((img) => img.isMain)?.imageUrl ?? product.images[0]?.imageUrl ?? null,
      },
      quantity
    );
    router.push("/cart");
  };

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `hi ! i want to order : "${product.title}"`
  )}`;

  return (
    <div>
      {/* Pre-order notice */}
      {isPreOrder && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary-light px-3 py-2.5 text-sm text-primary">
          Currently out of stock — order now as a pre-order and we&apos;ll ship it by{" "}
          <strong>{restockDate}</strong>.
        </div>
      )}

      <p className="text-sm font-semibold mb-2">Quantity</p>
      <div className="flex items-center gap-3">
        {/* Quantity box — sized to its own content, never stretched */}
        <div className="inline-flex h-12 shrink-0 items-center rounded-full border border-border">
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
          className="h-12 flex-1 rounded-full bg-primary px-6 text-base font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          {isPreOrder ? "Pre-Order" : "Order Now"}
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
