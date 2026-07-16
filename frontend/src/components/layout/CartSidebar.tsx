"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

/**
 * Slide-in cart drawer, opened from the header cart icon. Stays in sync with
 * the localStorage cart via the shared "cart:updated" event.
 *
 * Portaled to <body> — the sticky header's backdrop-blur creates a containing
 * block that would trap `fixed` descendants at header height (same reason as
 * MobileSidebar). Closed (off-canvas + inert) by default.
 */
export default function CartSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // Portal target exists only in the browser; render the panel after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const sync = () => setItems(getCart());
    sync();
    window.addEventListener("cart:updated", sync);
    return () => window.removeEventListener("cart:updated", sync);
  }, []);

  // Live stock (fetched when the drawer opens) drives the same in-stock /
  // pre-order row split as the cart page. Not shown as a count anywhere.
  const [stock, setStock] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchCartStock(getCart()).then((map) => {
      if (!cancelled) setStock(map);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white transition-transform duration-300 ease-out ${
          open ? "translate-x-0 shadow-2xl" : "translate-x-full"
        }`}
      >
        {/* Top bar: title + close */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            Your Cart{count > 0 && <span className="ml-1.5 text-sm font-medium text-muted">({count})</span>}
          </h2>
          <button
            type="button"
            aria-label="Close cart"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-surface text-muted">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="20" r="1.6" />
                <circle cx="17" cy="20" r="1.6" />
                <path d="M3 4h2l2.6 12h10.2L20 8H6" />
              </svg>
            </span>
            <div>
              <p className="text-base font-semibold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted">Looks like you haven&apos;t added anything yet.</p>
            </div>
            <Link
              href="/products"
              onClick={onClose}
              className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Items — scrolls independently. Same rows as the cart page:
                quantities beyond stock split into an In Stock row plus a
                Pre-Order row of the same product. */}
            <ul className="flex-1 overflow-y-auto divide-y divide-border px-4">
              {splitCartRows(items, stock).map((row) => {
                const { item } = row;
                const isOverflowRow = row.preOrder && row.qty < item.quantity;
                return (
                  <li key={`${item.productId}-${row.preOrder ? "pre" : "reg"}`} className="flex gap-3 py-4">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={onClose}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface"
                    >
                      <ProductImage src={item.imageUrl} alt={item.title} sizes="80px" />
                    </Link>

                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/product/${item.slug}`}
                            onClick={onClose}
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
                            isOverflowRow
                              ? `Remove pre-order units of ${item.title}`
                              : `Remove ${item.title}`
                          }
                          onClick={() =>
                            isOverflowRow
                              ? setItemQuantity(item.productId, item.quantity - row.qty)
                              : removeFromCart(item.productId)
                          }
                          className="p-1 text-muted hover:text-primary transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        {row.hasStepper ? (
                          <div className="inline-flex h-8 items-center rounded-full border border-border">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => setItemQuantity(item.productId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="px-2.5 text-muted hover:text-primary disabled:opacity-40 transition-colors"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-medium">{row.qty}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => setItemQuantity(item.productId, item.quantity + 1)}
                              className="px-2.5 text-muted hover:text-primary transition-colors"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex h-8 items-center rounded-full border border-border px-3 text-sm font-medium">
                            Quantity {row.qty}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          {formatPrice(parseFloat(item.price) * row.qty)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Footer: subtotal + View Cart / Checkout in one row */}
            <div className="border-t border-border p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-base font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="rounded-full border border-primary px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-primary-light transition-colors"
                >
                  View Cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
