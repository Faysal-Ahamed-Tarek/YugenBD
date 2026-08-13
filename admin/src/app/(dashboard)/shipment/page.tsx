"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ShipmentDate } from "@/lib/types";

/** Mirrors the ship-by date format shown on the storefront's product page. */
function formatShipBy(dateStr: string) {
  // Parse as a plain calendar date (no time/timezone) so the preview always
  // matches what was picked, regardless of the admin's local timezone.
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Sets the single "next shipment arrival" date shown on pre-order product
 * pages ("we'll ship it by <date>"). Replaces the old hardcoded +15-days
 * guess — the storefront now reads this value from GET /shipment.
 */
export default function ShipmentPage() {
  const [current, setCurrent] = useState<ShipmentDate | null>(null);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<ShipmentDate | null>("/shipment")
      .then((r) => {
        setCurrent(r.data);
        if (r.data) setDate(r.data.expectedDate);
      })
      .catch(() => setError("Could not load the current shipment date."))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!date) return setError("Pick a date.");

    setSubmitting(true);
    try {
      const res = await api.put<ShipmentDate>("/shipment", { expectedDate: date });
      setCurrent(res.data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the shipment date.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">Shipment</h1>
      <p className="mt-1 text-sm text-muted">
        Set the next shipment&apos;s expected arrival date. Pre-order product pages show it as the
        &ldquo;we&apos;ll ship it by&rdquo; date, instead of a fixed guess.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-background p-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Expected arrival date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition"
            />
          </div>

          {date && (
            <p className="rounded-lg bg-surface px-3 py-2.5 text-sm text-muted">
              Product pages will read:
              <br />
              <span className="text-foreground">
                &ldquo;Currently out of stock — order now as a pre-order and we&apos;ll ship it by{" "}
                <strong>{formatShipBy(date)}</strong>.&rdquo;
              </span>
            </p>
          )}

          {current && (
            <p className="text-xs text-muted">Last updated {new Date(current.updatedAt).toLocaleString("en-GB")}.</p>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Shipment date saved.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? "Saving…" : "Save Date"}
          </button>
        </form>
      )}
    </div>
  );
}
