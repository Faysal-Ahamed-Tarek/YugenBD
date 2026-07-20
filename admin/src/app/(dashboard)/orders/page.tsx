"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatPrice, formatDate, ORDER_STATUSES, STATUS_STYLES } from "@/lib/format";
import type { Order, OrderCounts } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import ManualOrderModal from "@/components/ManualOrderModal";

const TABS = ["all", ...ORDER_STATUSES] as const;

/** How often the pending-order badge re-checks the server. */
const COUNTS_POLL_MS = 30_000;

export default function OrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<(typeof TABS)[number]>("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [counts, setCounts] = useState<OrderCounts | null>(null);
  const filterRef = useRef(statusFilter);
  filterRef.current = statusFilter;

  // Per-status counts drive the tab badges and the "N pending" pill. Polled so
  // an order placed while this page is open surfaces without a manual refresh.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get<OrderCounts>("/orders/counts");
        if (!cancelled) setCounts(res.data);
      } catch {
        /* leave the previous counts on screen — badges are informational */
      }
    };
    load();
    const timer = setInterval(load, COUNTS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reloadKey]);

  const fetchPage = useCallback(async ({ q, page }: { q: string; page: number }) => {
    const params = new URLSearchParams({ page: String(page), limit: "16" });
    if (q) params.set("q", q);
    if (filterRef.current !== "all") params.set("status", filterRef.current);
    const res = await api.get<Order[]>(`/orders?${params.toString()}`);
    return { rows: res.data, hasMore: res.meta?.pagination.hasMore ?? false };
  }, []);

  const selectTab = (tab: (typeof TABS)[number]) => {
    setStatusFilter(tab);
    setReloadKey((k) => k + 1);
  };

  // Columns are Order / Customer / Total / Status / Account / Date. Row actions
  // (PDF, status editing) live on the detail page reached by clicking the row.
  const columns: Column<Order>[] = [
    { header: "Order", cell: (o) => <span className="font-mono text-xs">{o.id.slice(0, 8)}</span> },
    {
      header: "Customer",
      cell: (o) => (
        <div>
          <p className="font-medium">{o.fullName}</p>
          <p className="text-xs text-muted">{o.phone}</p>
        </div>
      ),
    },
    { header: "Total", cell: (o) => <span className="font-semibold">{formatPrice(o.total)}</span> },
    {
      header: "Status",
      cell: (o) => (
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[o.status] ?? "bg-surface"}`}
        >
          {o.status}
        </span>
      ),
    },
    {
      header: "Account",
      cell: (o) => <AccountBadge registered={Boolean(o.hasAccount)} />,
    },
    { header: "Date", cell: (o) => <span className="text-muted">{formatDate(o.createdAt)}</span> },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Orders</h1>
          {counts !== null && counts.pending > 0 && (
            <button
              type="button"
              onClick={() => selectTab("pending")}
              title="Show pending orders"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 hover:bg-amber-200 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-600" />
              </span>
              {counts.pending} pending
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          + Manual Order
        </button>
      </div>

      {manualOpen && (
        <ManualOrderModal
          onClose={() => setManualOpen(false)}
          onCreated={() => {
            setManualOpen(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = statusFilter === tab;
          const count = counts ? (tab === "all" ? counts.total : counts[tab]) : null;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => selectTab(tab)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                active ? "bg-primary text-white" : "border border-border hover:border-primary"
              }`}
            >
              {tab}
              {count !== null && count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-xs font-semibold ${
                    active
                      ? "bg-white/25 text-white"
                      : tab === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-surface text-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AdminTable
        columns={columns}
        fetchPage={fetchPage}
        getRowKey={(o) => o.id}
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
        searchPlaceholder="Search by customer name or phone…"
        reloadKey={reloadKey}
      />
    </div>
  );
}

/**
 * Whether the order's phone number matches a registered customer account —
 * green tick for registered, red cross for a guest/unknown number. Matched on
 * phone by the backend, so a guest checkout by an existing customer still
 * reads as registered.
 */
function AccountBadge({ registered }: { registered: boolean }) {
  return (
    <span
      title={registered ? "Registered account" : "No account for this number"}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
        registered ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
    >
      <span className="sr-only">{registered ? "Registered account" : "No account"}</span>
      {registered ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l5 5L20 6.5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
    </span>
  );
}
