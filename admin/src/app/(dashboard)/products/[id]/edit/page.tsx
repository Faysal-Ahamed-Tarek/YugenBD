"use client";

import { use, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import ProductForm from "@/components/ProductForm";

interface DetailProduct extends Product {
  concerns?: { id: string; title: string; slug: string }[];
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DetailProduct>(`/products/${id}`)
      .then((r) => setProduct(r.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"));
  }, [id]);

  if (error) return <p className="text-primary">{error}</p>;
  if (!product) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit Product</h1>
      <ProductForm initial={product} />
    </div>
  );
}
