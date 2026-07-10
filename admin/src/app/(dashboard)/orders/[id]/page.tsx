"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, API_URL, ApiError } from "@/lib/api";
import {
  formatPrice,
  formatDateTime,
  ORDER_STATUSES,
  STATUS_STYLES,
  ZONE_LABEL,
} from "@/lib/format";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Order>(`/orders/${id}`)
      .then((r) => setOrder(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (error || !order)
    return (
      <div>
        <p className="text-primary">{error ?? "Order not found."}</p>
        <Link href="/orders" className="mt-4 inline-block text-sm text-muted hover:text-primary">
          ← Back to orders
        </Link>
      </div>
    );

  const changeStatus = async (status: OrderStatus) => {
    const prev = order.status;
    setOrder({ ...order, status });
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
    } catch {
      setOrder({ ...order, status: prev });
    }
  };

  const markVerified = async () => {
    const prev = order.paymentStatus;
    setOrder({ ...order, paymentStatus: "verified" });
    try {
      await api.patch<Order>(`/orders/${order.id}/payment-status`, { paymentStatus: "verified" });
    } catch {
      setOrder({ ...order, paymentStatus: prev as PaymentStatus });
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/orders" className="text-sm text-muted hover:text-primary">
            ← Back to orders
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            Order <span className="font-mono text-lg">{order.id.slice(0, 8)}</span>
          </h1>
          <p className="text-sm text-muted">{formatDateTime(order.createdAt)}</p>
        </div>
        <a
          href={`${API_URL}/orders/${order.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Download PDF
        </a>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Customer */}
        <section className="rounded-2xl border border-border bg-background p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Customer</h2>
          <p className="font-medium">{order.fullName}</p>
          <p className="text-sm text-muted">{order.phone}</p>
          <p className="mt-2 text-sm">{order.address}</p>
          <p className="mt-3 text-sm text-muted">
            {ZONE_LABEL[order.deliveryZone] ?? order.deliveryZone} · {formatPrice(order.deliveryFee)} ·{" "}
            {order.deliveryEstimate}
          </p>
        </section>

        {/* Status + payment */}
        <section className="rounded-2xl border border-border bg-background p-5 lg:col-span-2 space-y-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Status</h2>
            <select
              value={order.status}
              onChange={(e) => changeStatus(e.target.value as OrderStatus)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize outline-none ${STATUS_STYLES[order.status] ?? "bg-surface"}`}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-background text-foreground">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Payment</h2>
            {order.paymentMethod === "bkash" ? (
              <div className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">bKash — Send Money</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      order.paymentStatus === "verified"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
                <dl className="mt-2 space-y-1 text-muted">
                  <div className="flex justify-between">
                    <dt>Transaction ID</dt>
                    <dd className="font-mono text-foreground">{order.bkashTransactionId ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Amount sent</dt>
                    <dd className="text-foreground">
                      {order.bkashAmount ? formatPrice(order.bkashAmount) : "—"}
                    </dd>
                  </div>
                </dl>
                {order.paymentStatus !== "verified" && (
                  <button
                    type="button"
                    onClick={markVerified}
                    className="mt-3 rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                  >
                    Mark Verified
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm">Cash on Delivery</p>
            )}
          </div>
        </section>
      </div>

      {/* Items */}
      <section className="mt-5 rounded-2xl border border-border bg-background p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-semibold">Item</th>
                <th className="py-2 px-3 font-semibold">Unit</th>
                <th className="py-2 px-3 font-semibold text-center">Qty</th>
                <th className="py-2 pl-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                        {item.imageUrl && (
                          <Image src={item.imageUrl} alt={item.title} fill sizes="48px" className="object-cover" />
                        )}
                      </span>
                      <div>
                        <p className="font-medium">
                          {item.title}
                          {item.weightLabel && <span className="text-muted"> · {item.weightLabel}</span>}
                        </p>
                        {item.isPreOrder && (
                          <span className="mt-0.5 inline-block rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Pre-Order
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-muted">{formatPrice(item.price)}</td>
                  <td className="py-3 px-3 text-center">{item.quantity}</td>
                  <td className="py-3 pl-3 text-right font-semibold">
                    {formatPrice(parseFloat(item.price) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Delivery</span>
            <span className="font-semibold">{formatPrice(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">{formatPrice(order.total)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
