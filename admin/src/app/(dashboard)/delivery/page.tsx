"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { DeliverySettings } from "@/lib/types";

/**
 * Free-delivery rules, replacing the value that used to be hardcoded as
 * FREE_DELIVERY_THRESHOLD = 3000 on both the server and the checkout page.
 *
 * The "always free" toggle is a MEMBER PERK: when on, every order placed by a
 * LOGGED-IN customer ships free no matter the subtotal. Guests are unaffected —
 * they pick a priced zone and only ship free once the subtotal reaches the
 * threshold below, so the threshold stays editable while the toggle is on. The
 * backend recomputes the authoritative fee from these same settings when an
 * order is placed.
 */
export default function DeliveryPage() {
  const [threshold, setThreshold] = useState("");
  const [alwaysFree, setAlwaysFree] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<DeliverySettings>("/delivery")
      .then((r) => {
        setThreshold(String(r.data.freeDeliveryThreshold));
        setAlwaysFree(r.data.alwaysFree);
      })
      .catch(() => setError("Could not load the delivery settings."))
      .finally(() => setLoading(false));
  }, []);

  const amount = parseFloat(threshold);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (Number.isNaN(amount) || amount < 0) return setError("Enter a valid free-delivery amount.");

    setSubmitting(true);
    try {
      await api.put<DeliverySettings>("/delivery", {
        freeDeliveryThreshold: amount,
        alwaysFree,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the delivery settings.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">Delivery</h1>
      <p className="mt-1 text-sm text-muted">
        Control when customers get free delivery. Otherwise the usual zone fee applies (৳70 inside
        Dhaka, ৳120 outside).
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-border bg-background p-5">
          <div>
            <label htmlFor="threshold" className="block text-sm font-medium mb-1.5">
              Free delivery above (৳)
            </label>
            <input
              id="threshold"
              type="number"
              min={0}
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted">
              Orders with a subtotal of this amount or more ship free
              {alwaysFree ? " — this is what guests (not logged in) get." : "."}
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3.5">
            <div>
              <p className="text-sm font-medium">Free delivery for all orders (logged-in customers)</p>
              <p className="mt-0.5 text-xs text-muted">
                Waives the delivery fee on every order placed from a customer account, ignoring the
                amount above. Guests still pay the zone fee below the amount above.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={alwaysFree}
              aria-label="Free delivery for all orders"
              onClick={() => setAlwaysFree((v) => !v)}
              className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                alwaysFree ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  alwaysFree ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <p className="rounded-lg bg-surface px-3 py-2.5 text-sm text-muted">
            {alwaysFree ? (
              <>
                Logged-in customers currently ship{" "}
                <span className="text-foreground font-medium">free</span> on every order. Guests ship
                free from{" "}
                <span className="text-foreground font-medium">
                  {Number.isNaN(amount) ? "—" : formatPrice(amount)}
                </span>{" "}
                up.
              </>
            ) : Number.isNaN(amount) ? (
              "Enter an amount to see the rule."
            ) : (
              <>
                Orders of{" "}
                <span className="text-foreground font-medium">{formatPrice(amount)}</span> or more
                ship free.
              </>
            )}
          </p>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Delivery settings saved.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? "Saving…" : "Save Settings"}
          </button>
        </form>
      )}
    </div>
  );
}
