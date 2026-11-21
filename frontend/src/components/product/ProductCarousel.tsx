import Link from "next/link";
import type { Product } from "@/types";
import Carousel from "@/components/ui/Carousel";
import Shuffle from "@/components/ui/Shuffle";
import ProductCard from "./ProductCard";

interface ProductCarouselProps {
  title: string;
  products: Product[];
  /** Optional "view all" destination shown next to the title */
  viewAllHref?: string;
  /** Show 8 picked at random from `products`, re-picked on every visit */
  shuffle?: boolean;
}

/**
 * Reusable titled product section: 2 cards per view on mobile (scroll-snap
 * swipe), 4 per view on desktop. Arrow controls show on mobile as well as
 * desktop, matching "Shop by Concern". Caps at 8 products.
 */
export default function ProductCarousel({ title, products, viewAllHref, shuffle = false }: ProductCarouselProps) {
  // Shuffled sections hand the whole pool to <Shuffle>, which picks the 8.
  const items = shuffle ? products : products.slice(0, 8);
  if (items.length === 0) return null;

  const cards = items.map((product) => (
    <li key={product.id} className="snap-start list-none">
      <ProductCard product={product} />
    </li>
  ));

  return (
    <section className="mx-auto max-w-7xl px-4 py-4 md:py-6">
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

      <Carousel label={title} mobileArrows>
        {shuffle ? <Shuffle take={8}>{cards}</Shuffle> : cards}
      </Carousel>
    </section>
  );
}
