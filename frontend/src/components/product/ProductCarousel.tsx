import Link from "next/link";
import type { Product } from "@/types";
import Carousel from "@/components/ui/Carousel";
import ProductCard from "./ProductCard";

interface ProductCarouselProps {
  title: string;
  products: Product[];
  /** Optional "view all" destination shown next to the title */
  viewAllHref?: string;
}

/**
 * Reusable titled product section: 2 cards per view on mobile (scroll-snap
 * swipe), 4 per view on desktop with arrow controls. Caps at 8 products.
 */
export default function ProductCarousel({ title, products, viewAllHref }: ProductCarouselProps) {
  const items = products.slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-8">
      <div className="mb-4 md:mb-6 flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            View all →
          </Link>
        )}
      </div>

      <Carousel label={title}>
        {items.map((product) => (
          <li key={product.id} className="snap-start list-none">
            <ProductCard product={product} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}
