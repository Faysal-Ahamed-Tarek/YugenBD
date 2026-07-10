import type { Product } from "@/types";
import ProductCard from "./ProductCard";

/**
 * Presentational product grid: 2 columns on mobile, 4 on desktop.
 * Isomorphic — used server-side (initial page) and inside the client
 * LoadMoreProducts (appended pages). `gapClass` overrides spacing.
 */
export default function ProductGrid({
  products,
  gapClass = "gap-3 md:gap-4",
}: {
  products: Product[];
  gapClass?: string;
}) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 ${gapClass}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
