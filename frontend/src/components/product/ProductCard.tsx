import Link from "next/link";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import ProductImage from "./ProductImage";
import AddToCartButton from "./AddToCartButton";

/**
 * Server component — the card markup (name, prices, link) is in the initial
 * HTML. Only the image fallback and cart button hydrate on the client.
 */
export default function ProductCard({ product }: { product: Product }) {
  const { basePrice, discountPrice, stock } = product;
  const hasDiscount =
    discountPrice !== null && parseFloat(discountPrice) < parseFloat(basePrice);

  const discountPercent = hasDiscount
    ? Math.round((1 - parseFloat(discountPrice as string) / parseFloat(basePrice)) * 100)
    : 0;

  const isPreOrder = stock <= 0;

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-background overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all duration-300">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-surface"
      >
        <ProductImage src={product.mainImage?.imageUrl ?? null} alt={product.title} />
        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
            -{discountPercent}%
          </span>
        )}
        {isPreOrder && (
          <span className="absolute top-2 right-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-white">
            Pre-Order
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
          <Link
            href={`/product/${product.slug}`}
            className="hover:text-primary transition-colors"
          >
            {product.title}
          </Link>
        </h3>

        <p className="mt-1.5 mb-3 flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span className="text-base font-semibold text-primary">
                {formatPrice(discountPrice as string)}
              </span>
              <s className="text-sm text-muted">{formatPrice(basePrice)}</s>
            </>
          ) : (
            <span className="text-base font-semibold text-primary">
              {formatPrice(basePrice)}
            </span>
          )}
        </p>

        <div className="mt-auto">
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
