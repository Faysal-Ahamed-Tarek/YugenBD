"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { CustomerListItem } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function UsersPage() {
  const router = useRouter();
  const [toDelete, setToDelete] = useState<CustomerListItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 16 rows per page; AdminTable appends the next page via "Load More".
  const fetchPage = useCallback(async ({ q, page }: { q: string; page: number }) => {
    const params = new URLSearchParams({ page: String(page), limit: "16" });
    if (q) params.set("q", q);
    const res = await api.get<CustomerListItem[]>(`/admin/users?${params.toString()}`);
    return { rows: res.data, hasMore: res.meta?.pagination.hasMore ?? false };
  }, []);

  const columns: Column<CustomerListItem>[] = [
    {
      header: "Customer",
      cell: (u) => (
        <div>
          <p className="font-medium">{u.fullName}</p>
          <p className="text-xs text-muted">{u.email ?? "No email"}</p>
        </div>
      ),
    },
    { header: "Phone", cell: (u) => <span className="font-mono text-xs">{u.phone}</span> },
    {
      header: "Location",
      cell: (u) =>
        u.districtName ? (
          <div>
            <p>{u.districtName}</p>
            <p className="text-xs text-muted">{u.divisionName}</p>
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      header: "Orders",
      cell: (u) => <span className="font-semibold">{u.orderCount}</span>,
    },
    {
      header: "Email",
      cell: (u) => (
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
            u.emailVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {u.emailVerified ? "Verified" : "Unverified"}
        </span>
      ),
    },
    { header: "Joined", cell: (u) => <span className="text-muted">{formatDate(u.createdAt)}</span> },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Users</h1>
      <AdminTable
        columns={columns}
        fetchPage={fetchPage}
        getRowKey={(u) => u.id}
        onRowClick={(u) => router.push(`/users/${u.id}`)}
        onDelete={(u) => setToDelete(u)}
        searchPlaceholder="Search by name, phone or email…"
        reloadKey={reloadKey}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete user"
        message={`Delete the account for "${toDelete?.fullName}" (${toDelete?.phone})? Their saved addresses are removed too. Past orders are kept, but stop being linked to an account. This cannot be undone.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await api.del(`/admin/users/${toDelete.id}`);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}
