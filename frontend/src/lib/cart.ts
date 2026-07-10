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
  weightLabel?: string | null;
  quantity: number;
}

const KEY = "yugenbd_cart";

/** A cart line is unique per product + chosen weight variant. */
function lineKey(productId: string, weightLabel?: string | null) {
  return `${productId}::${weightLabel ?? ""}`;
}

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
  const key = lineKey(item.productId, item.weightLabel);
  const existing = cart.find((i) => lineKey(i.productId, i.weightLabel) === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...item, quantity });
  }
  save(cart);
}

/** Set a line's quantity to an exact value (clamped to >= 1). */
export function setItemQuantity(productId: string, quantity: number, weightLabel?: string | null): void {
  const cart = getCart();
  const key = lineKey(productId, weightLabel);
  const item = cart.find((i) => lineKey(i.productId, i.weightLabel) === key);
  if (!item) return;
  item.quantity = Math.max(1, Math.floor(quantity));
  save(cart);
}

export function removeFromCart(productId: string, weightLabel?: string | null): void {
  const key = lineKey(productId, weightLabel);
  save(getCart().filter((i) => lineKey(i.productId, i.weightLabel) !== key));
}

export function clearCart(): void {
  save([]);
}

export function getCartSubtotal(): number {
  return getCart().reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
}
