"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const PLACEHOLDER = "/placeholder.svg";

export default function ProductsPage() {
  const router = useRouter();
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchPage = useCallback(async ({ q, page }: { q: string; page: number }) => {
    const params = new URLSearchParams({ page: String(page), limit: "16" });
    if (q) params.set("q", q);
    const res = await api.get<Product[]>(`/products?${params.toString()}`);
    return { rows: res.data, hasMore: res.meta?.pagination.hasMore ?? false };
  }, []);

  const columns: Column<Product>[] = [
    {
      header: "Product",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface">
            <Image src={p.mainImage?.imageUrl ?? PLACEHOLDER} alt="" fill sizes="44px" className="object-cover" />
          </span>
          <span className="font-medium">{p.title}</span>
        </div>
      ),
    },
    {
      header: "Price",
      cell: (p) => (
        <span>
          {formatPrice(p.discountPrice ?? p.basePrice)}
          {p.discountPrice && <s className="ml-1 text-xs text-muted">{formatPrice(p.basePrice)}</s>}
        </span>
      ),
    },
    { header: "Stock", cell: (p) => <span className={p.stock === 0 ? "text-red-600" : ""}>{p.stock}</span> },
    {
      header: "Status",
      cell: (p) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-surface text-muted"}`}>
          {p.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/products/new" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
          + New Product
        </Link>
      </div>

      <AdminTable
        columns={columns}
        fetchPage={fetchPage}
        getRowKey={(p) => p.id}
        searchPlaceholder="Search products by title…"
        reloadKey={reloadKey}
        onEdit={(p) => router.push(`/products/${p.id}/edit`)}
        onDelete={(p) => setToDelete(p)}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete product"
        message={`Delete "${toDelete?.title}"? This cannot be undone.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/products/${toDelete.id}`);
            setReloadKey((k) => k + 1);
          }
        }}
      />
    </div>
  );
}
