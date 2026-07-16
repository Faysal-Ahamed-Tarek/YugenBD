"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCart, clearCart, splitCartRows, fetchCartStock, type CartItem } from "@/lib/cart";
import { createOrder } from "@/lib/api";
import { getFreshAccessToken, authApi } from "@/lib/authClient";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { DeliveryZone, PaymentMethod, LocationOption, ShippingAddress } from "@/types";
import ProductImage from "@/components/product/ProductImage";

// Local Bangladeshi format for order-time phone capture: 01XXXXXXXXX (11 digits).
const BD_PHONE = /^01[3-9]\d{8}$/;

// bKash merchant/personal number shown to the customer (they Send Money to it,
// then type the transaction id/amount). Configurable via env.
const BKASH_NUMBER = process.env.NEXT_PUBLIC_BKASH_NUMBER ?? "01924415506";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Public location reference data for the cascading address selector. */
async function fetchLocations(path: string): Promise<LocationOption[]> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: LocationOption[] };
  return json.data ?? [];
}

const selectClass =
  "w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition disabled:opacity-50 disabled:cursor-not-allowed";

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
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  // Stock per product — used only to mirror the cart's in-stock / pre-order
  // row split in the order summary (the backend splits authoritatively).
  const [stock, setStock] = useState<Record<string, number>>({});

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [divisions, setDivisions] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [upazilas, setUpazilas] = useState<LocationOption[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [upazilaId, setUpazilaId] = useState("");
  const [area, setArea] = useState("");
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

  // Load divisions for the address selector.
  useEffect(() => {
    fetchLocations("/locations/divisions").then(setDivisions);
  }, []);

  // Fetch stock for the summary's pre-order split (same pattern as /cart).
  useEffect(() => {
    let cancelled = false;
    fetchCartStock(getCart()).then((map) => {
      if (!cancelled) setStock(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Signed-in customers: prefill the form from their saved shipping address
  // (falling back to account name/phone). Everything stays editable — we only
  // fill fields the customer hasn't typed into yet, so a slow response never
  // clobbers their input. Guests skip this entirely.
  const prefilledRef = useRef(false);
  const divisionIdRef = useRef(divisionId);
  divisionIdRef.current = divisionId;
  useEffect(() => {
    if (!user || prefilledRef.current) return;
    prefilledRef.current = true;
    (async () => {
      try {
        const res = await authApi.get<ShippingAddress | null>("/addresses/me");
        const a = res.data;
        // Account phone is +8801… ; the checkout field wants local 01… format.
        const localPhone = (a?.phone ?? user.phone ?? "").replace(/^\+880/, "0");
        setFullName((prev) => prev || a?.fullName || user.fullName || "");
        setPhone((prev) => prev || (BD_PHONE.test(localPhone) ? localPhone : ""));
        if (a && !divisionIdRef.current) {
          const [dists, upas] = await Promise.all([
            fetchLocations(`/locations/districts?divisionId=${a.divisionId}`),
            fetchLocations(`/locations/upazilas?districtId=${a.districtId}`),
          ]);
          // Re-check: the customer may have started picking while we fetched.
          if (!divisionIdRef.current) {
            setDistricts(dists);
            setUpazilas(upas);
            setDivisionId(a.divisionId);
            setDistrictId(a.districtId);
            setUpazilaId(a.upazilaId);
            setArea((prev) => prev || a.addressLine1);
          }
        }
      } catch {
        /* leave the form blank — checkout still works without the prefill */
      }
    })();
  }, [user]);

  const onDivision = async (id: string) => {
    setDivisionId(id);
    setDistrictId("");
    setUpazilaId("");
    setDistricts([]);
    setUpazilas([]);
    setTouched((t) => ({ ...t, address: true }));
    if (id) setDistricts(await fetchLocations(`/locations/districts?divisionId=${id}`));
  };
  const onDistrict = async (id: string) => {
    setDistrictId(id);
    setUpazilaId("");
    setUpazilas([]);
    if (id) setUpazilas(await fetchLocations(`/locations/upazilas?districtId=${id}`));
  };

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0),
    [items]
  );

  // Summary rows: quantities beyond stock show as a separate Pre-Order row of
  // the same product, mirroring the cart page and the final order lines.
  const summaryRows = splitCartRows(items, stock);
  const selected = DELIVERY_OPTIONS.find((o) => o.zone === zone) ?? null;
  const total = selected ? subtotal + selected.fee : null;

  // Address is built from the cascading location selection.
  const divisionName = divisions.find((d) => d.id === divisionId)?.name ?? "";
  const districtName = districts.find((d) => d.id === districtId)?.name ?? "";
  const upazilaName = upazilas.find((u) => u.id === upazilaId)?.name ?? "";
  const locationChosen = Boolean(divisionId && districtId && upazilaId);
  const composedAddress = [area.trim(), upazilaName, districtName, divisionName].filter(Boolean).join(", ");

  const bkashAmountNum = parseFloat(bkashAmount);
  const errors = {
    fullName: fullName.trim().length < 2 ? "Please enter your full name" : "",
    phone: BD_PHONE.test(phone.trim()) ? "" : "Enter a valid number (01XXXXXXXXX)",
    address: !locationChosen
      ? "Select your division, district and upazila / thana"
      : area.trim().length < 3
        ? "Please enter your area"
        : "",
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
    // Fresh token (null for guests) so a signed-in customer's order links to
    // their account and shows up in their dashboard order history.
    const accessToken = await getFreshAccessToken();
    const result = await createOrder(
      {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: composedAddress,
        deliveryZone: zone,
        paymentMethod,
        ...(paymentMethod === "bkash"
          ? { bkashTransactionId: bkashTxn.trim(), bkashAmount: bkashAmountNum }
          : {}),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      },
      accessToken
    );
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
                <label className="block text-sm font-medium mb-1.5">Delivery Address</label>
                {/* Four fields in two rows (50 / 50). Area unlocks only after
                    division → district → upazila are all selected. */}
                <div className="grid grid-cols-2 gap-3">
                  <select
                    aria-label="Division"
                    value={divisionId}
                    onChange={(e) => onDivision(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select division</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="District"
                    value={districtId}
                    onChange={(e) => onDistrict(e.target.value)}
                    disabled={!divisionId}
                    className={selectClass}
                  >
                    <option value="">{divisionId ? "Select district" : "Select division first"}</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Upazila / Thana"
                    value={upazilaId}
                    onChange={(e) => {
                      setUpazilaId(e.target.value);
                      setTouched((t) => ({ ...t, address: true }));
                    }}
                    disabled={!districtId}
                    className={selectClass}
                  >
                    <option value="">{districtId ? "Select upazila / thana" : "Select district first"}</option>
                    {upazilas.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                    disabled={!locationChosen}
                    placeholder={locationChosen ? "Area (house / road)" : "Select location first"}
                    className={selectClass}
                  />
                </div>
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
              {summaryRows.map((row) => (
                <li key={`${row.item.productId}-${row.preOrder ? "pre" : "reg"}`} className="flex gap-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <ProductImage src={row.item.imageUrl} alt={row.item.title} sizes="56px" />
                  </span>
                  <span className="flex-1 text-sm">
                    <span className="line-clamp-1">
                      {row.item.title}
                    </span>
                    <span className="text-muted">
                      Quantity {row.qty}
                      {row.preOrder ? (
                        <span className="ml-2 inline-block rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold align-middle text-white">
                          Pre-Order
                        </span>
                      ) : (
                        <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold align-middle text-green-700">
                          In Stock
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-sm font-semibold">
                    {formatPrice(parseFloat(row.item.price) * row.qty)}
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
