"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatPrice, formatDate, ORDER_STATUSES, STATUS_STYLES } from "@/lib/format";
import type { Order } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import ManualOrderModal from "@/components/ManualOrderModal";

const TABS = ["all", ...ORDER_STATUSES] as const;

export default function OrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<(typeof TABS)[number]>("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const filterRef = useRef(statusFilter);
  filterRef.current = statusFilter;

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

  // Columns are exactly Order / Customer / Total / Status / Date. Row actions
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
    { header: "Date", cell: (o) => <span className="text-muted">{formatDate(o.createdAt)}</span> },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
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
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => selectTab(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              statusFilter === tab ? "bg-primary text-white" : "border border-border hover:border-primary"
            }`}
          >
            {tab}
          </button>
        ))}
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
