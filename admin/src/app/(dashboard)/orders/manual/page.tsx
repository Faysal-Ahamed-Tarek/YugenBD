"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatPrice, ORDER_STATUSES } from "@/lib/format";
import type { LocationOption, Order, OrderStatus, Product } from "@/lib/types";

// Local Bangladeshi phone format (matches the backend order schema).
const BD_PHONE = /^01[3-9]\d{8}$/;

// Fees shown for context only; the backend recomputes the authoritative total.
const ZONES: { zone: "inside_dhaka" | "outside_dhaka"; label: string; fee: number }[] = [
  { zone: "inside_dhaka", label: "Inside Dhaka (৳70, 1-2 days)", fee: 70 },
  { zone: "outside_dhaka", label: "Outside Dhaka (৳120, 2-3 days)", fee: 120 },
];

interface Line {
  product: Product;
  quantity: number;
}

const inputClass =
  "w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary";

/**
 * Manual order entry — products and the full customer details (including the
 * cascading division → district → upazila / thana + area) on ONE page, so the
 * admin can see everything at once instead of stepping through a modal.
 */
export default function ManualOrderPage() {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [zone, setZone] = useState<"inside_dhaka" | "outside_dhaka" | null>(null);
  // Per-order delivery-fee waiver — the backend honours this regardless of zone.
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [status, setStatus] = useState<OrderStatus>("confirmed");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cascading location selects — never free-typed, always picked from /locations.
  const [divisions, setDivisions] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [upazilas, setUpazilas] = useState<LocationOption[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [upazilaId, setUpazilaId] = useState("");

  useEffect(() => {
    api
      .get<LocationOption[]>("/locations/divisions")
      .then((r) => setDivisions(r.data))
      .catch(() => setDivisions([]));
  }, []);

  const onDivision = async (id: string) => {
    setDivisionId(id);
    setDistrictId("");
    setUpazilaId("");
    setDistricts([]);
    setUpazilas([]);
    if (!id) return;
    const res = await api.get<LocationOption[]>(`/locations/districts?divisionId=${id}`);
    setDistricts(res.data);
  };

  const onDistrict = async (id: string) => {
    setDistrictId(id);
    setUpazilaId("");
    setUpazilas([]);
    if (!id) return;
    const res = await api.get<LocationOption[]>(`/locations/upazilas?districtId=${id}`);
    setUpazilas(res.data);
  };

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

  const setQty = (id: string, qty: number) =>
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(1, qty) } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.product.id !== id));

  const linePrice = (l: Line) => parseFloat(l.product.discountPrice ?? l.product.basePrice);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + linePrice(l) * l.quantity, 0), [lines]);
  const selectedZone = ZONES.find((z) => z.zone === zone);
  const deliveryFee = freeDelivery ? 0 : selectedZone?.fee ?? null;
  const total = deliveryFee !== null ? subtotal + deliveryFee : null;

  const phoneValid = BD_PHONE.test(phone.trim());
  const locationValid = Boolean(divisionId && districtId && upazilaId && area.trim().length >= 3);
  const canSubmit =
    lines.length > 0 && fullName.trim().length >= 2 && phoneValid && locationValid && Boolean(zone);

  const submit = async () => {
    setError(null);
    if (!canSubmit || !zone) return;
    setSubmitting(true);
    try {
      const res = await api.post<Order>("/orders/manual", {
        fullName: fullName.trim(),
        phone: phone.trim(),
        divisionId,
        districtId,
        upazilaId,
        area: area.trim(),
        deliveryZone: zone,
        freeDelivery,
        status,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      router.push(`/orders/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create order.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl">
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

          {lines.length > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {lines.map((l) => (
                <li key={l.product.id} className="flex items-center gap-2 py-2.5">
                  <span className="flex-1 text-sm">{l.product.title}</span>
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
                    className="text-muted hover:text-red-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted">No products added yet.</p>
          )}
        </section>

        {/* Customer details — contact + full location together */}
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

            <div>
              <label className="mb-1.5 block text-sm font-medium">Division</label>
              <select
                value={divisionId}
                onChange={(e) => onDivision(e.target.value)}
                className={inputClass}
              >
                <option value="">Select division</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">District</label>
              <select
                value={districtId}
                onChange={(e) => onDistrict(e.target.value)}
                disabled={!divisionId}
                className={`${inputClass} disabled:opacity-60`}
              >
                <option value="">{divisionId ? "Select district" : "Select division first"}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Upazila / Thana</label>
              <select
                value={upazilaId}
                onChange={(e) => setUpazilaId(e.target.value)}
                disabled={!districtId}
                className={`${inputClass} disabled:opacity-60`}
              >
                <option value="">
                  {districtId ? "Select upazila / thana" : "Select district first"}
                </option>
                {upazilas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Area"
              value={area}
              onChange={setArea}
              placeholder="House / road / area"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Select Delivery Option</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ZONES.map((z) => (
                <button
                  key={z.zone}
                  type="button"
                  onClick={() => setZone(z.zone)}
                  className={`rounded-lg border p-2.5 text-left text-sm transition-colors ${
                    zone === z.zone ? "border-primary bg-primary-light" : "border-border hover:border-primary/50"
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
            {/* Zone stays selected (it sets the delivery estimate); this only
                waives the fee for this one order. */}
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={freeDelivery}
                onChange={(e) => setFreeDelivery(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Free delivery {selectedZone && !freeDelivery ? `(waive ৳${selectedZone.fee})` : "(৳0 delivery fee)"}
            </label>
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
