import Link from "next/link";
import type { Concern } from "@/types";
import Carousel from "@/components/ui/Carousel";
import ProductImage from "@/components/product/ProductImage";

/**
 * Server component: "Shop by Concern" cards — concern image + title, each
 * linking to its concern listing page. 3 cards per view on mobile, 6 on
 * desktop, on the shared scroll-snap Carousel shell. Every concern is shown
 * regardless of whether it has any linked products.
 */
export default function ShopByConcern({ concerns }: { concerns: Concern[] }) {
  const items = concerns;
  if (items.length === 0) return null;

  return (
    <section aria-label="Shop by concern" className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <h2 className="mb-4 md:mb-6 text-xl md:text-2xl font-semibold">Shop by Concern</h2>

      <Carousel
        label="Shop by Concern"
        itemColsClass="auto-cols-[calc(33.333%-8px)] md:auto-cols-[calc(16.666%-14px)]"
      >
        {items.map((concern) => (
          <li key={concern.id} className="snap-start list-none">
            <Link
              href={`/concern/${concern.slug}`}
              className="group block text-center"
              aria-label={`Shop products for ${concern.title}`}
            >
              <span className="relative block aspect-square overflow-hidden rounded-xl bg-surface border border-border group-hover:border-primary transition-all">
                <ProductImage
                  src={concern.imageUrl}
                  alt={concern.title}
                  sizes="(max-width: 768px) 33vw, 200px"
                  fit="contain"
                />
              </span>
              <span className="mt-2.5 block text-xs md:text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                {concern.title}
              </span>
            </Link>
          </li>
        ))}
      </Carousel>
    </section>
  );
}
