"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { Order, Product } from "@/lib/types";

interface TopSeller {
  productId: string | null;
  title: string;
  unitsSold: number;
  revenue: string;
  imageUrl: string | null;
}
interface LowStockItem {
  id: string;
  title: string;
  slug: string;
  stock: number;
  imageUrl: string | null;
}

const PLACEHOLDER = "/placeholder.svg";

export default function DashboardPage() {
  const { user } = useAuth();
  const [productCount, setProductCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [topSellers, setTopSellers] = useState<TopSeller[] | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[] | null>(null);

  useEffect(() => {
    api.get<Product[]>("/products?limit=1&status=published").then((r) => setProductCount(r.meta?.pagination.total ?? null));
    api.get<Order[]>("/orders?limit=1").then((r) => setOrderCount(r.meta?.pagination.total ?? null));
    api.get<Order[]>("/orders?limit=1&status=pending").then((r) => setPendingCount(r.meta?.pagination.total ?? null));
    api.get<TopSeller[]>("/admin/dashboard/top-selling").then((r) => setTopSellers(r.data));
    api.get<LowStockItem[]>("/admin/dashboard/low-stock").then((r) => setLowStock(r.data));
  }, []);

  const stats = [
    { label: "Published products", value: productCount, href: "/products" },
    { label: "Total orders", value: orderCount, href: "/orders" },
    { label: "Pending orders", value: pendingCount, href: "/orders" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back, {user?.fullName?.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-muted">Here&apos;s a quick look at your store.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-2xl border border-border bg-background p-5 hover:border-primary/50 transition-colors">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{card.value === null ? "…" : card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 best sellers */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <h2 className="mb-4 font-semibold">Top 10 Best Sellers</h2>
          {topSellers === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : topSellers.length === 0 ? (
            <p className="text-sm text-muted">No sales yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {topSellers.map((p, i) => (
                <li key={p.productId ?? i} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 text-sm font-semibold text-muted">{i + 1}</span>
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <Image src={p.imageUrl ?? PLACEHOLDER} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{p.title}</span>
                  <span className="text-right text-sm">
                    <span className="font-semibold">{p.unitsSold}</span>
                    <span className="text-muted"> sold</span>
                    <br />
                    <span className="text-xs text-muted">{formatPrice(p.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Low inventory */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <h2 className="mb-4 font-semibold">Low Inventory (&lt;10)</h2>
          {lowStock === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-muted">All products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lowStock.map((p) => {
                const tone = p.stock <= 3 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                return (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                      <Image src={p.imageUrl ?? PLACEHOLDER} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <Link href={`/products/${p.id}/edit`} className="flex-1 text-sm font-medium truncate hover:text-primary">
                      {p.title}
                    </Link>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{p.stock} left</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
