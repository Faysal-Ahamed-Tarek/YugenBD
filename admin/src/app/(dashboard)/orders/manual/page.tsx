"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatPrice, ORDER_STATUSES } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/lib/types";

// Local Bangladeshi phone format (matches the backend order schema).
const BD_PHONE = /^01[3-9]\d{8}$/;

// Delivery options the admin picks from. Fees shown for context only; the
// backend recomputes the authoritative total. "Free" still has to send a zone
// (the order row requires one for the delivery estimate), so it rides on
// inside_dhaka with the per-order fee waiver switched on.
type DeliveryOption = "free" | "inside_dhaka" | "outside_dhaka";
const DELIVERY_OPTIONS: {
  option: DeliveryOption;
  zone: "inside_dhaka" | "outside_dhaka";
  label: string;
  detail: string;
  fee: number;
}[] = [
  { option: "free", zone: "inside_dhaka", label: "Free delivery", detail: "৳0", fee: 0 },
  { option: "inside_dhaka", zone: "inside_dhaka", label: "Inside Dhaka", detail: "৳70 · 1-2 days", fee: 70 },
  { option: "outside_dhaka", zone: "outside_dhaka", label: "Outside Dhaka", detail: "৳120 · 2-3 days", fee: 120 },
];

interface Line {
  product: Product;
  quantity: number;
}

/** Off-catalogue line: a product not listed on the website, priced by hand. */
interface CustomLine {
  id: number;
  title: string;
  price: number;
  quantity: number;
}

const inputClass =
  "w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary";

/**
 * Manual order entry — products (catalogue search and/or custom off-catalogue
 * lines) and the customer details with a single free-text address, all on ONE
 * page so the admin can see everything at once.
 */
export default function ManualOrderPage() {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(null);
  // Flat ৳ discount off the product subtotal (never the delivery fee).
  const [discountInput, setDiscountInput] = useState("");
  // Coupon: validated (and priced) by the backend's public preview endpoint;
  // the order endpoint re-validates it, so this is display only.
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [status, setStatus] = useState<OrderStatus>("confirmed");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Product search
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (search.trim().length < 1) return setResults([]);
      const res = await api.get<Product[]>(
        `/products?q=${encodeURIComponent(search)}&limit=8&status=published`
      );
      setResults(res.data);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const addProduct = (p: Product) => {
    setSearch("");
    setResults([]);
    if (lines.some((l) => l.product.id === p.id)) return;
    setLines((prev) => [...prev, { product: p, quantity: 1 }]);
  };

  // Custom (off-catalogue) products: name + unit price typed by the admin.
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const customPriceNum = Number(customPrice);
  const customValid =
    customTitle.trim().length > 0 && customPrice.trim() !== "" && Number.isFinite(customPriceNum) && customPriceNum >= 0;

  const addCustom = () => {
    if (!customValid) return;
    setCustomLines((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: customTitle.trim(),
        price: customPriceNum,
        quantity: Math.max(1, parseInt(customQty, 10) || 1),
      },
    ]);
    setCustomTitle("");
    setCustomPrice("");
    setCustomQty("1");
  };
  const setCustomLineQty = (id: number, qty: number) =>
    setCustomLines((prev) => prev.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, qty) } : l)));
  const removeCustom = (id: number) => setCustomLines((prev) => prev.filter((l) => l.id !== id));

  const setQty = (id: string, qty: number) =>
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(1, qty) } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.product.id !== id));

  const linePrice = (l: Line) => parseFloat(l.product.discountPrice ?? l.product.basePrice);
  const subtotal = useMemo(
    () =>
      lines.reduce((s, l) => s + linePrice(l) * l.quantity, 0) +
      customLines.reduce((s, l) => s + l.price * l.quantity, 0),
    [lines, customLines]
  );
  const hasItems = lines.length + customLines.length > 0;
  const selectedDelivery = DELIVERY_OPTIONS.find((d) => d.option === deliveryOption);
  const zone = selectedDelivery?.zone ?? null;
  const freeDelivery = deliveryOption === "free";
  const deliveryFee = selectedDelivery?.fee ?? null;
  const couponDiscount = coupon?.discount ?? 0;
  const discountNum = discountInput.trim() === "" ? 0 : Number(discountInput);
  const discountValid =
    Number.isFinite(discountNum) && discountNum >= 0 && discountNum + couponDiscount <= subtotal;
  const discount = discountValid ? discountNum : 0;
  const total = deliveryFee !== null ? subtotal - couponDiscount - discount + deliveryFee : null;

  const validateCoupon = async (code: string, forSubtotal: number) => {
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await api.post<{ code: string; discount: string }>("/coupons/validate", {
        code,
        subtotal: forSubtotal,
      });
      setCoupon({ code: res.data.code, discount: Number(res.data.discount) });
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : "Could not check this coupon.");
    } finally {
      setCouponLoading(false);
    }
  };
  const applyCoupon = () => {
    const code = couponInput.trim();
    if (code.length < 3 || !hasItems) return;
    void validateCoupon(code, subtotal);
  };
  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };
  // Percent coupons and minimum-subtotal rules depend on the cart, so re-price
  // the applied coupon whenever the subtotal changes.
  const appliedCode = coupon?.code;
  useEffect(() => {
    if (!appliedCode) return;
    if (subtotal <= 0) {
      setCoupon(null);
      return;
    }
    void validateCoupon(appliedCode, subtotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const phoneValid = BD_PHONE.test(phone.trim());
  const addressValid = address.trim().length >= 5;
  const canSubmit =
    hasItems &&
    fullName.trim().length >= 2 &&
    phoneValid &&
    addressValid &&
    Boolean(zone) &&
    discountValid &&
    !couponLoading;

  const submit = async () => {
    setError(null);
    if (!canSubmit || !zone) return;
    setSubmitting(true);
    try {
      const res = await api.post<Order>("/orders/manual", {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        deliveryZone: zone,
        freeDelivery,
        discount,
        ...(coupon ? { couponCode: coupon.code } : {}),
        status,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        customItems: customLines.map((l) => ({ title: l.title, price: l.price, quantity: l.quantity })),
      });
      router.push(`/orders/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create order.");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link href="/orders" className="text-sm text-muted hover:text-primary">
          ← Back to orders
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Manual Order</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Products */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Products</h2>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products to add…"
              className={inputClass}
            />
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
                    >
                      <span>{p.title}</span>
                      <span className="text-muted">
                        {formatPrice(parseFloat(p.discountPrice ?? p.basePrice))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasItems ? (
            <ul className="mt-3 divide-y divide-border">
              {/* Column headings: unit price, quantity, line total. */}
              <li aria-hidden="true" className="flex items-center gap-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted">
                <span className="flex-1">Product</span>
                <span className="w-20 text-right">Price</span>
                <span className="w-14 text-center">Qty</span>
                <span className="w-20 text-right">Total</span>
                <span className="w-3" />
              </li>
              {lines.map((l) => (
                <li key={l.product.id} className="flex items-center gap-2 py-2.5">
                  <span className="flex-1 text-sm">{l.product.title}</span>
                  <span className="w-20 text-right text-sm text-muted">{formatPrice(linePrice(l))}</span>
                  <input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => setQty(l.product.id, parseInt(e.target.value, 10) || 1)}
                    className="h-8 w-14 rounded border border-border bg-surface px-2 text-sm"
                  />
                  <span className="w-20 text-right text-sm font-semibold">
                    {formatPrice(linePrice(l) * l.quantity)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${l.product.title}`}
                    onClick={() => removeLine(l.product.id)}
                    className="w-3 cursor-pointer text-muted hover:text-red-600"
                  >
                    ×
                  </button>
                </li>
              ))}
              {customLines.map((l) => (
                <li key={l.id} className="flex items-center gap-2 py-2.5">
                  <span className="flex-1 text-sm">{l.title}</span>
                  <span className="w-20 text-right text-sm text-muted">{formatPrice(l.price)}</span>
                  <input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => setCustomLineQty(l.id, parseInt(e.target.value, 10) || 1)}
                    className="h-8 w-14 rounded border border-border bg-surface px-2 text-sm"
                  />
                  <span className="w-20 text-right text-sm font-semibold">{formatPrice(l.price * l.quantity)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${l.title}`}
                    onClick={() => removeCustom(l.id)}
                    className="w-3 cursor-pointer text-muted hover:text-red-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted">No products added yet.</p>
          )}

          {/* Products that aren't listed on the website */}
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-medium">Custom product</h3>
            <div className="grid grid-cols-[1fr_6.5rem_4rem] gap-2">
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="Product name"
                aria-label="Custom product name"
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="Price ৳"
                aria-label="Custom product unit price"
                className={inputClass}
              />
              <input
                type="number"
                min={1}
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                aria-label="Custom product quantity"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={addCustom}
              disabled={!customValid}
              className="mt-2 cursor-pointer rounded-full border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              + Add custom product
            </button>
          </div>
        </section>

        {/* Customer details — contact + a single free-text address */}
        <section className="rounded-2xl border border-border bg-background p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Customer details
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field
              label="Phone (01XXXXXXXXX)"
              value={phone}
              onChange={setPhone}
              error={phone && !phoneValid ? "Invalid BD phone" : ""}
            />
          </div>

          <div>
            <label htmlFor="manual-address" className="mb-1.5 block text-sm font-medium">
              Address
            </label>
            <textarea
              id="manual-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="House / road, area, thana, district"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Select Delivery Option</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DELIVERY_OPTIONS.map((d) => (
                <button
                  key={d.option}
                  type="button"
                  onClick={() => setDeliveryOption(d.option)}
                  aria-pressed={deliveryOption === d.option}
                  className={`cursor-pointer rounded-lg border p-2.5 text-left text-sm transition-colors ${
                    deliveryOption === d.option
                      ? "border-primary bg-primary-light"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="block font-medium">{d.label}</span>
                  <span className="block text-xs text-muted">{d.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="manual-discount" className="mb-1.5 block text-sm font-medium">
              Discount (৳)
            </label>
            <input
              id="manual-discount"
              type="number"
              min={0}
              max={subtotal}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
            {!discountValid && (
              <p className="mt-1 text-xs text-primary">
                {discountNum < 0 || !Number.isFinite(discountNum)
                  ? "Enter a valid amount"
                  : couponDiscount > 0
                    ? `Discount plus coupon can't exceed the product subtotal (${formatPrice(subtotal)})`
                    : `Can't exceed the product subtotal (${formatPrice(subtotal)})`}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="manual-coupon" className="mb-1.5 block text-sm font-medium">
              Coupon
            </label>
            {coupon ? (
              <div className="flex h-10 items-center justify-between rounded-lg border border-primary bg-primary-light px-3 text-sm">
                <span>
                  <span className="font-mono font-semibold text-primary">{coupon.code}</span>
                  <span className="ml-2 text-muted">
                    {couponLoading ? "Checking…" : `−${formatPrice(coupon.discount)}`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="cursor-pointer text-sm font-medium text-muted hover:text-primary"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="manual-coupon"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  placeholder="Coupon code"
                  className={`${inputClass} font-mono uppercase`}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponLoading || couponInput.trim().length < 3 || !hasItems}
                  className="shrink-0 cursor-pointer rounded-lg border border-primary px-4 text-sm font-medium text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {couponLoading ? "Checking…" : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className="mt-1 text-xs text-primary">{couponError}</p>}
            {!coupon && !hasItems && couponInput.trim() && (
              <p className="mt-1 text-xs text-muted">Add products before applying a coupon.</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className={`${inputClass} capitalize`}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>

      {error && (
        <p className="mt-5 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-5">
        <div className="text-sm">
          <p className="text-muted">
            Subtotal: <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
          </p>
          {coupon && couponDiscount > 0 && (
            <p className="text-muted">
              Coupon ({coupon.code}):{" "}
              <span className="font-semibold text-primary">−{formatPrice(couponDiscount)}</span>
            </p>
          )}
          {discount > 0 && (
            <p className="text-muted">
              Discount: <span className="font-semibold text-primary">−{formatPrice(discount)}</span>
            </p>
          )}
          <p className="text-muted">
            Delivery:{" "}
            <span className="font-semibold text-foreground">
              {deliveryFee === null ? "—" : deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
            </span>
          </p>
          <p className="text-muted">
            Total:{" "}
            <span className="font-bold text-primary">
              {total !== null ? formatPrice(total) : "—"}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/orders"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-surface"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating…" : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </div>
  );
}
