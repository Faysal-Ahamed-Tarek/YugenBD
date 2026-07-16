"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { authApi, ApiError } from "@/lib/authClient";
import ProductImage from "@/components/product/ProductImage";
import type { Order, LocationOption, ShippingAddress } from "@/types";

type Tab = "shipping" | "orders" | "password";

export default function AccountPage() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted">Loading…</div>;
  }

  const navItem = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`w-full rounded-lg px-3 py-2.5 text-left text-base font-medium transition-colors ${
        tab === t ? "bg-primary-light text-primary" : "text-foreground hover:bg-surface"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <h1 className="text-2xl font-semibold">My Account</h1>
      <p className="mt-1 text-base text-muted">Signed in as {user.fullName}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="h-max rounded-2xl border border-border bg-background p-2 md:sticky md:top-20">
          <nav className="space-y-1">
            {navItem("orders", "Orders")}
            {navItem("shipping", "Shipping Details")}
            {navItem("password", "Password")}
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="w-full rounded-lg px-3 py-2.5 text-left text-base font-medium text-muted hover:bg-surface hover:text-primary transition-colors"
            >
              Log out
            </button>
          </nav>
        </aside>

        {/* Content */}
        <div>
          {tab === "shipping" ? <ShippingDetails /> : tab === "password" ? <ChangePassword /> : <OrderHistory />}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Shipping details ─────────────────────────── */

const BD_PHONE = /^01[3-9]\d{8}$/;

function ShippingDetails() {
  const { user } = useAuth();
  const [divisions, setDivisions] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [upazilas, setUpazilas] = useState<LocationOption[]>([]);

  const [fullName, setFullName] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [upazilaId, setUpazilaId] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchDistricts = useCallback(async (divId: string) => {
    const res = await authApi.get<LocationOption[]>(`/locations/districts?divisionId=${divId}`);
    setDistricts(res.data);
  }, []);
  const fetchUpazilas = useCallback(async (disId: string) => {
    const res = await authApi.get<LocationOption[]>(`/locations/upazilas?districtId=${disId}`);
    setUpazilas(res.data);
  }, []);

  // Load divisions + any saved address, pre-selecting the cascade.
  useEffect(() => {
    (async () => {
      try {
        const [divRes, addr] = await Promise.all([
          authApi.get<LocationOption[]>("/locations/divisions"),
          authApi.get<ShippingAddress | null>("/addresses/me"),
        ]);
        setDivisions(divRes.data);
        if (addr.data) {
          const a = addr.data;
          setFullName(a.fullName ?? user?.fullName ?? "");
          setDivisionId(a.divisionId);
          setDistrictId(a.districtId);
          setUpazilaId(a.upazilaId);
          setPhone(a.phone ?? user?.phone ?? "");
          setAddressLine1(a.addressLine1);
          await fetchDistricts(a.divisionId);
          await fetchUpazilas(a.districtId);
        } else {
          // No saved address yet — prefill from the account (registration data).
          setFullName(user?.fullName ?? "");
          if (user?.phone) setPhone(user.phone);
        }
      } catch {
        /* leave empty; fields still selectable */
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchDistricts, fetchUpazilas, user?.phone, user?.fullName]);

  const onDivision = async (id: string) => {
    setDivisionId(id);
    setDistrictId("");
    setUpazilaId("");
    setDistricts([]);
    setUpazilas([]);
    setSaved(false);
    if (id) await fetchDistricts(id);
  };
  const onDistrict = async (id: string) => {
    setDistrictId(id);
    setUpazilaId("");
    setUpazilas([]);
    setSaved(false);
    if (id) await fetchUpazilas(id);
  };

  const complete =
    fullName.trim().length >= 2 &&
    divisionId &&
    districtId &&
    upazilaId &&
    BD_PHONE.test(phone) &&
    addressLine1.trim().length >= 3;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (fullName.trim().length < 2 || !divisionId || !districtId || !upazilaId || addressLine1.trim().length < 3) {
      return setError("All fields are required.");
    }
    if (!BD_PHONE.test(phone)) {
      return setError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
    }
    setSaving(true);
    try {
      await authApi.put("/addresses/me", {
        fullName: fullName.trim(),
        divisionId,
        districtId,
        upazilaId,
        phone,
        addressLine1: addressLine1.trim(),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    "w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed";

  if (loading) return <p className="text-base text-muted">Loading…</p>;

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <h2 className="text-lg font-semibold">Shipping Details</h2>
      <p className="mt-1 text-base text-muted">Where should we deliver your orders?</p>

      <form onSubmit={save} className="mt-5 space-y-4">
        <div>
          <label className="block text-base font-medium mb-1.5">Full name</label>
          <input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            placeholder="Recipient's full name"
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-base font-medium mb-1.5">Division</label>
          <select value={divisionId} onChange={(e) => onDivision(e.target.value)} className={selectClass}>
            <option value="">Select division</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-base font-medium mb-1.5">District</label>
          <select
            value={districtId}
            onChange={(e) => onDistrict(e.target.value)}
            disabled={!divisionId}
            className={selectClass}
          >
            <option value="">{divisionId ? "Select district" : "Select a division first"}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-base font-medium mb-1.5">Upazila / Thana</label>
          <select
            value={upazilaId}
            onChange={(e) => {
              setUpazilaId(e.target.value);
              setSaved(false);
            }}
            disabled={!districtId}
            className={selectClass}
          >
            <option value="">{districtId ? "Select upazila / thana" : "Select a district first"}</option>
            {upazilas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-base font-medium mb-1.5">Address Line 1</label>
          <input
            value={addressLine1}
            onChange={(e) => {
              setAddressLine1(e.target.value);
              setSaved(false);
            }}
            placeholder="House / road / area"
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-base font-medium mb-1.5">Mobile number</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, ""));
              setSaved(false);
            }}
            placeholder="01XXXXXXXXX"
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary"
          />
        </div>

        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-base text-primary">{error}</p>}
        {saved && (
          <p className="rounded-lg bg-green-100 px-3 py-2 text-base text-green-700">Shipping details saved.</p>
        )}

        <button
          type="submit"
          disabled={saving || !complete}
          className="h-11 rounded-full bg-primary px-8 text-base font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

/* ─────────────────────────── Change password ─────────────────────────── */

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const complete =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const inputClass =
    "w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword.length < 8) {
      return setError("New password must be at least 8 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match.");
    }
    setSaving(true);
    try {
      // Rotates the refresh cookie server-side; this session stays signed in,
      // any other device's session is invalidated.
      await authApi.post("/auth/change-password", { currentPassword, newPassword });
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <h2 className="text-lg font-semibold">Password</h2>
      <p className="mt-1 text-base text-muted">
        Change the password you use to sign in. Other devices will be signed out.
      </p>

      <form onSubmit={save} className="mt-5 max-w-md space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-base font-medium mb-1.5">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-base font-medium mb-1.5">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          />
          <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-base font-medium mb-1.5">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          />
          {mismatch && <p className="mt-1 text-sm text-primary">New passwords do not match.</p>}
        </div>

        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-base text-primary">{error}</p>}
        {saved && (
          <p className="rounded-lg bg-green-100 px-3 py-2 text-base text-green-700">Password updated.</p>
        )}

        <button
          type="submit"
          disabled={saving || !complete}
          className="h-11 rounded-full bg-primary px-8 text-base font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {saving ? "Updating…" : "Update Password"}
        </button>
      </form>
    </section>
  );
}

/* ─────────────────────────── Order history ─────────────────────────── */

const taka = (v: string) => `৳${Math.round(parseFloat(v))}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-surface text-muted",
  confirmed: "bg-primary-light text-primary",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ZONE_LABEL: Record<string, string> = {
  inside_dhaka: "Inside Dhaka",
  outside_dhaka: "Outside Dhaka",
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash (Send Money)",
};

function OrderHistory() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    authApi
      .get<Order[]>("/orders/mine")
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]));
  }, []);

  return (
    <section>
      <h2 className="text-lg font-semibold">Order History</h2>
      {orders === null ? (
        <p className="mt-3 text-base text-muted">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-base text-muted">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/products"
            className="mt-3 inline-flex rounded-full bg-primary px-5 py-2.5 text-base font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-4">
          {orders.map((order) => {
            const itemCount = order.items.reduce((n, it) => n + it.quantity, 0);
            const hasPreOrder = order.items.some((it) => it.isPreOrder);
            return (
              <li
                key={order.id}
                className="rounded-2xl border border-border bg-background p-4 md:p-5"
              >
                {/* Header: id + date + status */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-base font-semibold">#{order.id.slice(0, 8)}</p>
                    <p className="mt-0.5 text-base text-muted">{formatDate(order.createdAt)}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      STATUS_STYLES[order.status] ?? "bg-surface text-muted"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Order-type chips */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                    {order.paymentMethod === "bkash" ? "bKash" : "COD"}
                  </span>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                    {ZONE_LABEL[order.deliveryZone] ?? order.deliveryZone}
                  </span>
                  {hasPreOrder && (
                    <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-white">
                      Includes pre-order
                    </span>
                  )}
                </div>

                {/* Items: image, name, quantity, unit + line price */}
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex gap-3 py-3">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                        <ProductImage src={item.imageUrl} alt={item.title} sizes="64px" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium">
                          {item.title}
                          {item.isPreOrder && (
                            <span className="ml-2 inline-block rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold align-middle text-white">
                              Pre-Order
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-base text-muted">
                          Qty {item.quantity} × {taka(item.price)}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-base font-semibold">
                        {taka(String(parseFloat(item.price) * item.quantity))}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Payment + delivery meta */}
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-base sm:grid-cols-2">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Payment method</dt>
                    <dd className="text-right font-medium">
                      {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Payment status</dt>
                    <dd className="text-right font-medium capitalize">
                      {order.paymentMethod === "cod" ? "Due on delivery" : order.paymentStatus}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Delivery</dt>
                    <dd className="text-right font-medium">
                      {ZONE_LABEL[order.deliveryZone] ?? order.deliveryZone} · {order.deliveryEstimate}
                    </dd>
                  </div>
                  {order.paymentMethod === "bkash" && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">bKash txn</dt>
                      <dd className="text-right font-mono font-medium">
                        {order.bkashTransactionId ?? "—"}
                        {order.bkashAmount ? ` · ${taka(order.bkashAmount)}` : ""}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Delivery address */}
                <div className="mt-3 rounded-lg bg-surface px-3 py-2.5 text-base">
                  <p className="font-medium">Delivering to</p>
                  <p className="mt-0.5 text-muted">
                    {order.fullName} · {order.phone}
                    <br />
                    {order.address}
                  </p>
                </div>

                {/* Totals */}
                <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-base">
                  <div className="flex justify-between">
                    <span className="text-muted">Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})</span>
                    <span className="font-medium">{taka(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Delivery fee</span>
                    <span className="font-medium">{taka(order.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-primary">{taka(order.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/order-confirmation/${order.id}`}
                    className="text-base font-semibold text-primary hover:underline"
                  >
                    View & download PDF →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
