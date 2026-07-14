"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { authApi, ApiError } from "@/lib/authClient";
import type { Order, LocationOption, ShippingAddress } from "@/types";

type Tab = "shipping" | "orders";

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
      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        tab === t ? "bg-primary-light text-primary" : "text-foreground hover:bg-surface"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <h1 className="text-2xl font-semibold">My Account</h1>
      <p className="mt-1 text-sm text-muted">Signed in as {user.fullName}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="h-max rounded-2xl border border-border bg-background p-2 md:sticky md:top-20">
          <nav className="space-y-1">
            {navItem("orders", "Orders")}
            {navItem("shipping", "Shipping Details")}
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-surface hover:text-primary transition-colors"
            >
              Exit
            </button>
          </nav>
        </aside>

        {/* Content */}
        <div>{tab === "shipping" ? <ShippingDetails /> : <OrderHistory />}</div>
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
          setDivisionId(a.divisionId);
          setDistrictId(a.districtId);
          setUpazilaId(a.upazilaId);
          setPhone(a.phone ?? user?.phone ?? "");
          setAddressLine1(a.addressLine1);
          await fetchDistricts(a.divisionId);
          await fetchUpazilas(a.districtId);
        } else if (user?.phone) {
          setPhone(user.phone); // sensible default = the account's mobile number
        }
      } catch {
        /* leave empty; fields still selectable */
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchDistricts, fetchUpazilas, user?.phone]);

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
    divisionId && districtId && upazilaId && BD_PHONE.test(phone) && addressLine1.trim().length >= 3;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!divisionId || !districtId || !upazilaId || addressLine1.trim().length < 3) {
      return setError("All fields are required.");
    }
    if (!BD_PHONE.test(phone)) {
      return setError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
    }
    setSaving(true);
    try {
      await authApi.put("/addresses/me", {
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
    "w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed";

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <h2 className="text-lg font-semibold">Shipping Details</h2>
      <p className="mt-1 text-sm text-muted">Where should we deliver your orders?</p>

      <form onSubmit={save} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Division</label>
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
          <label className="block text-sm font-medium mb-1.5">District</label>
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
          <label className="block text-sm font-medium mb-1.5">Upazila / Thana</label>
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
          <label className="block text-sm font-medium mb-1.5">Address Line 1</label>
          <input
            value={addressLine1}
            onChange={(e) => {
              setAddressLine1(e.target.value);
              setSaved(false);
            }}
            placeholder="House / road / area"
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Mobile number</label>
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
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
        </div>

        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}
        {saved && (
          <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700">Shipping details saved.</p>
        )}

        <button
          type="submit"
          disabled={saving || !complete}
          className="h-11 rounded-full bg-primary px-8 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
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
        <p className="mt-3 text-sm text-muted">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/products"
            className="mt-3 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((order) => {
            const itemCount = order.items.reduce((n, it) => n + it.quantity, 0);
            return (
              <li key={order.id}>
                <Link
                  href={`/order-confirmation/${order.id}`}
                  className="block rounded-2xl border border-border bg-background p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-muted">#{order.id.slice(0, 8)}</p>
                      <p className="mt-0.5 text-sm text-muted">{formatDate(order.createdAt)}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLES[order.status] ?? "bg-surface text-muted"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted">
                      {itemCount} item{itemCount === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold">{taka(order.total)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
