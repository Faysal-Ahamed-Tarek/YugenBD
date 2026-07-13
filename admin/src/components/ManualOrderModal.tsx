"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatPrice, ORDER_STATUSES } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/lib/types";
import Modal from "@/components/ui/Modal";

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

/** Two-step manual order modal: pick products first, then customer details. */
export default function ManualOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [lines, setLines] = useState<Line[]>([]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState<"inside_dhaka" | "outside_dhaka" | null>(null);
  const [status, setStatus] = useState<OrderStatus>("confirmed");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Product search
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (search.trim().length < 1) return setResults([]);
      const res = await api.get<Product[]>(`/products?q=${encodeURIComponent(search)}&limit=8&status=published`);
      setResults(res.data);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const addProduct = async (p: Product) => {
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
  const total = selectedZone ? subtotal + selectedZone.fee : null;

  const phoneValid = BD_PHONE.test(phone.trim());
  const customerValid = fullName.trim().length >= 2 && phoneValid && address.trim().length >= 5 && zone;
  const canSubmit = lines.length > 0 && customerValid;

  const submit = async () => {
    setError(null);
    if (!canSubmit || !zone) return;
    setSubmitting(true);
    try {
      await api.post<Order>("/orders/manual", {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        deliveryZone: zone,
        status,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
        })),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create order.");
      setSubmitting(false);
    }
  };

  return (
    <Modal open title={`Manual Order — Step ${step} of 2`} onClose={onClose}>
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">Add the products for this order.</p>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products to add…"
              className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            />
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-52 overflow-y-auto">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
                    >
                      <span>{p.title}</span>
                      <span className="text-muted">{formatPrice(parseFloat(p.discountPrice ?? p.basePrice))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lines.length > 0 ? (
            <ul className="divide-y divide-border">
              {lines.map((l) => (
                <li key={l.product.id} className="py-2.5">
                  <div className="flex items-center gap-2">
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
                    <button type="button" onClick={() => removeLine(l.product.id)} className="text-muted hover:text-red-600">
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No products added yet.</p>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm">
              Subtotal: <span className="font-semibold">{formatPrice(subtotal)}</span>
            </span>
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={() => setStep(2)}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              Next: Customer
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Full name" value={fullName} onChange={setFullName} />
          <Field label="Phone (01XXXXXXXXX)" value={phone} onChange={setPhone} error={phone && !phoneValid ? "Invalid BD phone" : ""} />
          <div>
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Delivery Option</label>
            <div className="space-y-2">
              {ZONES.map((z) => (
                <button
                  key={z.zone}
                  type="button"
                  onClick={() => setZone(z.zone)}
                  className={`w-full rounded-lg border p-2.5 text-left text-sm transition-colors ${
                    zone === z.zone ? "border-primary bg-primary-light" : "border-border hover:border-primary/50"
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm capitalize outline-none focus:border-primary"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted">
              Total: <span className="font-bold text-primary">{total !== null ? formatPrice(total) : "—"}</span>
            </span>
          </div>

          {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}

          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => setStep(1)} className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface">
              Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating…" : "Create Order"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
      />
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </div>
  );
}
