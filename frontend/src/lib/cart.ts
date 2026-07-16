"use client";

/**
 * Minimal localStorage cart. Components stay in sync by listening for the
 * custom "cart:updated" event — no context provider or state library needed.
 */
export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  price: string;
  imageUrl: string | null;
  quantity: number;
}

const KEY = "yugenbd_cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function save(cart: CartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart:updated"));
}

export function addToCart(item: Omit<CartItem, "quantity">, quantity = 1): void {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...item, quantity });
  }
  save(cart);
}

/** Set a line's quantity to an exact value (clamped to >= 1). */
export function setItemQuantity(productId: string, quantity: number): void {
  const cart = getCart();
  const item = cart.find((i) => i.productId === productId);
  if (!item) return;
  item.quantity = Math.max(1, Math.floor(quantity));
  save(cart);
}

export function removeFromCart(productId: string): void {
  save(getCart().filter((i) => i.productId !== productId));
}

export function clearCart(): void {
  save([]);
}

export function getCartSubtotal(): number {
  return getCart().reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
}

/* ───────────── In-stock / pre-order display split ─────────────
 * Shared by the cart page, cart sidebar and checkout summary so all three
 * render cart lines identically (and match how the backend splits orders). */

export interface CartDisplayRow {
  item: CartItem;
  /** Quantity shown on this row (a slice of item.quantity when split). */
  qty: number;
  preOrder: boolean;
  /** Whether this row carries the quantity stepper for the item. */
  hasStepper: boolean;
}

/**
 * A line whose quantity exceeds stock becomes TWO rows of the same product:
 * the covered part (static) and the pre-order overflow (with the stepper —
 * it's the part that grows/shrinks). Stock never limits quantity. Stock 0 or
 * unknown keeps a single row.
 */
export function splitCartRows(
  items: CartItem[],
  stock: Record<string, number>
): CartDisplayRow[] {
  return items.flatMap((item): CartDisplayRow[] => {
    const s = stock[item.productId];
    if (s === undefined || s === 0 || item.quantity <= s) {
      return [{ item, qty: item.quantity, preOrder: s === 0, hasStepper: true }];
    }
    return [
      { item, qty: s, preOrder: false, hasStepper: false },
      { item, qty: item.quantity - s, preOrder: true, hasStepper: true },
    ];
  });
}

/** Live stock per product for the given cart items (missing on fetch failure). */
export async function fetchCartStock(items: CartItem[]): Promise<Record<string, number>> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const results = await Promise.all(
    items.map(async ({ productId, slug }) => {
      try {
        const res = await fetch(`${apiUrl}/products/slug/${encodeURIComponent(slug)}`);
        if (!res.ok) return null;
        const json = await res.json();
        return json?.success ? { productId, stock: json.data.stock as number } : null;
      } catch {
        return null;
      }
    })
  );
  const map: Record<string, number> = {};
  for (const r of results) if (r) map[r.productId] = r.stock;
  return map;
}
