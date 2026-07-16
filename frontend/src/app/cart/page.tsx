"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCart,
  setItemQuantity,
  removeFromCart,
  splitCartRows,
  fetchCartStock,
  type CartItem,
} from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import ProductImage from "@/components/product/ProductImage";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  // Load cart + keep in sync with the shared cart:updated event.
  useEffect(() => {
    const sync = () => setItems(getCart());
    sync();
    setReady(true);
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, []);

  // Fetch current stock per product — not shown to the customer, only used to
  // split partially-covered lines into an in-stock row + a pre-order row.
  useEffect(() => {
    let cancelled = false;
    fetchCartStock(getCart()).then((map) => {
      if (!cancelled) setStock(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);

  // Shared in-stock / pre-order display split (see lib/cart.ts).
  const rows = splitCartRows(items, stock);

  if (ready && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-surface text-muted">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="20" r="1.6" />
            <circle cx="17" cy="20" r="1.6" />
            <path d="M3 4h2l2.6 12h10.2L20 8H6" />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted">Looks like you haven&apos;t added anything yet.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold">Your Cart</h1>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <ul className="lg:col-span-2 divide-y divide-border border-y border-border">
          {rows.map((row) => {
            const { item } = row;
            // The pre-order half of a split line: removing it only trims the
            // quantity back down to what stock covers.
            const isOverflowRow = row.preOrder && row.qty < item.quantity;
            return (
              <li key={`${item.productId}-${row.preOrder ? "pre" : "reg"}`} className="flex gap-4 py-4">
                <Link
                  href={`/product/${item.slug}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface"
                >
                  <ProductImage src={item.imageUrl} alt={item.title} sizes="96px" />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/product/${item.slug}`}
                        className="text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-2"
                      >
                        {item.title}
                      </Link>
                      {row.preOrder ? (
                        <span className="mt-1 inline-block rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Pre-Order
                        </span>
                      ) : (
                        <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          In Stock
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={
                        isOverflowRow ? `Remove pre-order units of ${item.title}` : `Remove ${item.title}`
                      }
                      onClick={() =>
                        isOverflowRow
                          ? setItemQuantity(item.productId, item.quantity - row.qty)
                          : removeFromCart(item.productId)
                      }
                      className="p-1 text-muted hover:text-primary transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </div>

                  <p className="mt-1 text-sm font-semibold text-primary">{formatPrice(item.price)}</p>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    {row.hasStepper ? (
                      <div className="inline-flex h-9 items-center rounded-full border border-border">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setItemQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-9 w-9 text-lg text-muted hover:text-primary disabled:opacity-40 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-9 text-center text-sm font-semibold">{row.qty}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => setItemQuantity(item.productId, item.quantity + 1)}
                          className="h-9 w-9 text-lg text-muted hover:text-primary disabled:opacity-40 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-semibold">
                        Quantity {row.qty}
                      </span>
                    )}
                    <span className="text-sm font-semibold">
                      {formatPrice(parseFloat(item.price) * row.qty)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Summary */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-border p-5">
            <h2 className="text-lg font-semibold">Order Summary</h2>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              Delivery fee is calculated at checkout based on your area.
            </p>
            <Link
              href="/checkout"
              className="mt-5 block rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/products"
              className="mt-3 block text-center text-sm text-muted hover:text-primary transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
