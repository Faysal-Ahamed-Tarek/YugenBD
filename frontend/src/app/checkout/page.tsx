"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCart, clearCart, type CartItem } from "@/lib/cart";
import { createOrder } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { DeliveryZone, PaymentMethod } from "@/types";
import ProductImage from "@/components/product/ProductImage";

// Local Bangladeshi format for order-time phone capture: 01XXXXXXXXX (11 digits).
const BD_PHONE = /^01[3-9]\d{8}$/;

// bKash merchant/personal number shown to the customer (they Send Money to it,
// then type the transaction id/amount). Configurable via env.
const BKASH_NUMBER = process.env.NEXT_PUBLIC_BKASH_NUMBER ?? "01700000000";

// Fees mirror the authoritative server values (order.service DELIVERY); the
// backend recomputes the total regardless.
const DELIVERY_OPTIONS: {
  zone: DeliveryZone;
  label: string;
  fee: number;
  estimate: string;
}[] = [
  { zone: "inside_dhaka", label: "Inside Dhaka", fee: 70, estimate: "Delivery in 1-2 days" },
  { zone: "outside_dhaka", label: "Outside Dhaka", fee: 120, estimate: "Delivery in 2-3 days" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState<DeliveryZone | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [bkashTxn, setBkashTxn] = useState("");
  const [bkashAmount, setBkashAmount] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cart; bounce back to /cart if it's empty.
  useEffect(() => {
    const cart = getCart();
    if (cart.length === 0) {
      router.replace("/cart");
      return;
    }
    setItems(cart);
    setReady(true);
  }, [router]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0),
    [items]
  );
  const selected = DELIVERY_OPTIONS.find((o) => o.zone === zone) ?? null;
  const total = selected ? subtotal + selected.fee : null;

  const bkashAmountNum = parseFloat(bkashAmount);
  const errors = {
    fullName: fullName.trim().length < 2 ? "Please enter your full name" : "",
    phone: BD_PHONE.test(phone.trim()) ? "" : "Enter a valid number (01XXXXXXXXX)",
    address: address.trim().length < 5 ? "Please enter your full delivery address" : "",
    bkashTxn:
      paymentMethod === "bkash" && bkashTxn.trim().length < 4 ? "Enter the bKash transaction ID" : "",
    bkashAmount:
      paymentMethod === "bkash" && !(bkashAmountNum > 0) ? "Enter the amount you sent" : "",
  };
  const formValid =
    !errors.fullName &&
    !errors.phone &&
    !errors.address &&
    !errors.bkashTxn &&
    !errors.bkashAmount &&
    zone !== null;

  const placeOrder = async () => {
    setTouched({ fullName: true, phone: true, address: true, bkashTxn: true, bkashAmount: true });
    if (!formValid || !zone) return;

    setSubmitting(true);
    setError(null);
    const result = await createOrder({
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      deliveryZone: zone,
      paymentMethod,
      ...(paymentMethod === "bkash"
        ? { bkashTransactionId: bkashTxn.trim(), bkashAmount: bkashAmountNum }
        : {}),
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    });
    if (result.ok && result.order) {
      clearCart();
      router.push(`/order-confirmation/${result.order.id}`);
    } else {
      setError(result.error ?? "Something went wrong.");
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold">Checkout</h1>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form */}
        <div className="lg:col-span-3 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">Delivery Details</h2>
            <div className="space-y-4">
              <Field
                id="fullName"
                label="Full Name"
                value={fullName}
                onChange={setFullName}
                onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                error={touched.fullName ? errors.fullName : ""}
                placeholder="e.g. Rahim Uddin"
              />
              <Field
                id="phone"
                label="Phone"
                value={phone}
                onChange={(v) => setPhone(v.replace(/\D/g, ""))}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                error={touched.phone ? errors.phone : ""}
                placeholder="01XXXXXXXXX"
                inputMode="numeric"
                maxLength={11}
              />
              <div>
                <label htmlFor="address" className="block text-sm font-medium mb-1.5">
                  Delivery Address
                </label>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                  rows={3}
                  placeholder="e.g. Dhaka, Dhanmondi, Road 5, House 12"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition resize-none"
                />
                {touched.address && errors.address && (
                  <p className="mt-1 text-xs text-primary">{errors.address}</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Select Delivery Option</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DELIVERY_OPTIONS.map((option) => {
                const active = zone === option.zone;
                return (
                  <button
                    key={option.zone}
                    type="button"
                    onClick={() => setZone(option.zone)}
                    aria-pressed={active}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary-light"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{option.label}</span>
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                          active ? "border-primary bg-primary text-white" : "border-border"
                        }`}
                      >
                        {active && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12.5l5 5L20 6.5" />
                          </svg>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{option.estimate}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">{formatPrice(option.fee)}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PaymentCard
                active={paymentMethod === "cod"}
                onClick={() => setPaymentMethod("cod")}
                title="Cash on Delivery"
                subtitle="Pay when you receive your order"
              />
              <PaymentCard
                active={paymentMethod === "bkash"}
                onClick={() => setPaymentMethod("bkash")}
                title="bKash Send Money"
                subtitle="Send money, then enter the reference"
              />
            </div>

            {paymentMethod === "bkash" && (
              <div className="mt-4 space-y-4 rounded-xl border border-border p-4">
                <p className="text-sm">
                  Send the total to our bKash number{" "}
                  <strong className="text-primary">{BKASH_NUMBER}</strong> (Send Money), then enter
                  your transaction ID and the amount you sent below.
                </p>
                <Field
                  id="bkashTxn"
                  label="bKash Transaction ID"
                  value={bkashTxn}
                  onChange={setBkashTxn}
                  onBlur={() => setTouched((t) => ({ ...t, bkashTxn: true }))}
                  error={touched.bkashTxn ? errors.bkashTxn : ""}
                  placeholder="e.g. 9AB1C2D3E4"
                />
                <Field
                  id="bkashAmount"
                  label="Amount Sent (৳)"
                  value={bkashAmount}
                  onChange={(v) => setBkashAmount(v.replace(/[^\d.]/g, ""))}
                  onBlur={() => setTouched((t) => ({ ...t, bkashAmount: true }))}
                  error={touched.bkashAmount ? errors.bkashAmount : ""}
                  placeholder={total !== null ? String(total) : "0"}
                  inputMode="numeric"
                />
              </div>
            )}
          </section>
        </div>

        {/* Summary (sticky on desktop) */}
        <aside className="lg:col-span-2">
          <div className="lg:sticky lg:top-20 rounded-2xl border border-border p-5">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <ProductImage src={item.imageUrl} alt={item.title} sizes="56px" />
                  </span>
                  <span className="flex-1 text-sm">
                    <span className="line-clamp-1">
                      {item.title}
                    </span>
                    <span className="text-muted">Qty {item.quantity}</span>
                  </span>
                  <span className="text-sm font-semibold">
                    {formatPrice(parseFloat(item.price) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span className="font-semibold">
                  {selected ? formatPrice(selected.fee) : <span className="text-muted font-normal">Select delivery option</span>}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary">
                  {total !== null ? formatPrice(total) : "—"}
                </span>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={placeOrder}
              disabled={!formValid || submitting}
              className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Placing Order…" : "Place Order"}
            </button>
            <Link href="/cart" className="mt-3 block text-center text-sm text-muted hover:text-primary transition-colors">
              Back to Cart
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PaymentCard({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active ? "border-primary bg-primary-light" : "border-border hover:border-primary/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{title}</span>
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
            active ? "border-primary bg-primary text-white" : "border-border"
          }`}
        >
          {active && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l5 5L20 6.5" />
            </svg>
          )}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </button>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  inputMode,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error: string;
  placeholder?: string;
  inputMode?: "tel" | "text" | "numeric";
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition"
      />
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </div>
  );
}
