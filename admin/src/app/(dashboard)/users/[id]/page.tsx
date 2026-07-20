"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatPrice, formatDate, formatDateTime, STATUS_STYLES } from "@/lib/format";
import type { CustomerDetail } from "@/lib/types";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CustomerDetail>(`/admin/users/${id}`)
      .then((r) => setCustomer(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load customer"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (error || !customer)
    return (
      <div>
        <p className="text-primary">{error ?? "Customer not found."}</p>
        <Link href="/users" className="mt-4 inline-block text-sm text-muted hover:text-primary">
          ← Back to users
        </Link>
      </div>
    );

  const { address, orders, stats } = customer;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link href="/users" className="text-sm text-muted hover:text-primary">
          ← Back to users
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{customer.fullName}</h1>
        <p className="text-sm text-muted">Joined {formatDate(customer.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Account */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Account</h2>
          <dl className="space-y-2.5 text-sm">
            <Row label="User name" value={customer.fullName} />
            <Row label="Phone number" value={customer.phone} />
            <Row
              label="Email"
              value={
                customer.email ? (
                  <span>
                    {customer.email}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        customer.emailVerified
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {customer.emailVerified ? "Verified" : "Unverified"}
                    </span>
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Row label="Status" value={customer.isActive ? "Active" : "Disabled"} />
          </dl>
        </section>

        {/* Shipping details */}
        <section className="rounded-2xl border border-border bg-background p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Shipping details
          </h2>
          {address ? (
            <dl className="grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
              <Row label="Recipient" value={address.fullName ?? customer.fullName} />
              <Row label="Phone number" value={address.phone ?? customer.phone} />
              <Row label="Division" value={address.divisionName} />
              <Row label="District" value={address.districtName} />
              <Row label="Upazila / Thana" value={address.upazilaName} />
              <Row label="Area" value={address.addressLine1} />
            </dl>
          ) : (
            <p className="text-sm text-muted">This customer has no saved shipping address.</p>
          )}
        </section>
      </div>

      {/* Purchase history */}
      <section className="mt-5 rounded-2xl border border-border bg-background p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Purchase history
          </h2>
          <p className="text-sm text-muted">
            {stats.orderCount} order{stats.orderCount === 1 ? "" : "s"} ·{" "}
            <span className="font-semibold text-foreground">{formatPrice(stats.totalSpent)}</span>{" "}
            spent
          </p>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-muted">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2.5 font-semibold">Order</th>
                  <th className="px-3 py-2.5 font-semibold">Items</th>
                  <th className="px-3 py-2.5 font-semibold">Total</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface/60"
                  >
                    <td className="px-3 py-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                    <td className="px-3 py-3">
                      <p className="line-clamp-2 text-xs text-muted">
                        {order.items.map((i) => `${i.title} × ${i.quantity}`).join(", ")}
                      </p>
                    </td>
                    <td className="px-3 py-3 font-semibold">{formatPrice(order.total)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                          STATUS_STYLES[order.status] ?? "bg-surface"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
