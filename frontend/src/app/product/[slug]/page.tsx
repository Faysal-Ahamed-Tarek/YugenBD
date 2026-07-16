import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts, formatPrice } from "@/lib/api";
import type { ProductDetail } from "@/types";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ProductGallery from "@/components/product/ProductGallery";
import ProductActions from "@/components/product/ProductActions";
import ProductAccordion, { type AccordionSection } from "@/components/product/ProductAccordion";
import ProductCarousel from "@/components/product/ProductCarousel";
import ReviewsSection from "@/components/product/ReviewsSection";
import { sanitizeHtml, hasContent } from "@/lib/sanitize";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Plain-text version of the (possibly HTML) shortDescription for meta/JSON-LD. */
function plainShortDescription(html: string | null): string | undefined {
  const text = sanitizeHtml(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : undefined;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const description =
    plainShortDescription(product.shortDescription) ??
    `Buy ${product.title} online in Bangladesh — cash on delivery.`;
  const image = product.images.find((img) => img.isMain)?.imageUrl ?? product.images[0]?.imageUrl;

  return {
    title: product.title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      url: `/product/${product.slug}`,
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
  };
}

function buildJsonLd(product: ProductDetail) {
  const paidPrice =
    product.discountPrice != null && parseFloat(product.discountPrice) < parseFloat(product.basePrice)
      ? product.discountPrice
      : product.basePrice;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: plainShortDescription(product.shortDescription),
    image: product.images.map((img) => img.imageUrl),
    url: `${SITE_URL}/product/${product.slug}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: paidPrice,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      url: `${SITE_URL}/product/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const { basePrice, discountPrice } = product;
  const displayPrice = discountPrice ?? basePrice;
  const hasDiscount =
    discountPrice !== null && parseFloat(discountPrice) < parseFloat(basePrice);
  const savings = hasDiscount ? parseFloat(basePrice) - parseFloat(discountPrice as string) : 0;
  const discountPercent = hasDiscount
    ? Math.round((savings / parseFloat(basePrice)) * 100)
    : 0;

  const primaryCategory = product.categories[0];

  // Post-review sections: "Recommended for you" pulls best sellers; "Related
  // products" pulls the product's primary category. Both exclude the product
  // being viewed. Fetched in parallel; each renders nothing when empty.
  const [bestSellers, sameCategory] = await Promise.all([
    getProducts({ categorySlug: "best-seller", limit: 9 }),
    primaryCategory ? getProducts({ categorySlug: primaryCategory.slug, limit: 9 }) : Promise.resolve([]),
  ]);
  const recommended = bestSellers.filter((p) => p.id !== product.id);
  const related = sameCategory.filter((p) => p.id !== product.id);

  // shortDescription is admin rich text (HTML) — sanitize on the server and
  // render as HTML (same pattern as the accordion), not as escaped text.
  const shortDescriptionHtml = sanitizeHtml(product.shortDescription);

  // Sanitize admin-authored rich text (HTML) on the server before it reaches
  // the client accordion, which renders it with dangerouslySetInnerHTML.
  const sections: AccordionSection[] = [
    { title: "Who is it best for?", content: sanitizeHtml(product.whoIsItBestFor) },
    { title: "Ingredients", content: sanitizeHtml(product.ingredients) },
    { title: "Usage Instructions", content: sanitizeHtml(product.usageInstructions) },
    { title: "Additional Information", content: sanitizeHtml(product.additionInformation) },
  ].filter((section) => hasContent(section.content));

  return (
    <>
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(product)) }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          ...(primaryCategory
            ? [{ label: primaryCategory.name, href: `/category/${primaryCategory.slug}` }]
            : []),
          { label: product.title },
        ]}
      />

      <article className="mt-4 md:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left: gallery — sticky on desktop while the right column scrolls */}
        <div className="lg:sticky lg:top-20">
          <ProductGallery images={product.images} title={product.title} />
        </div>

        {/* Right: purchase panel — also sticky so actions stay in view */}
        <div className="lg:sticky lg:top-20">
          <h1 className="text-2xl md:text-4xl font-semibold leading-tight">{product.title}</h1>

          {/* Categories */}
          {product.categories.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Categories">
              {product.categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted hover:text-primary hover:border-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Price */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl md:text-3xl font-bold text-foreground">
              {formatPrice(displayPrice)}
            </span>
            {hasDiscount && (
              <>
                <s className="text-lg text-muted">{formatPrice(basePrice)}</s>
                <span className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">
                  SAVE {formatPrice(savings)} ({discountPercent}%)
                </span>
              </>
            )}
          </div>

          {/* Short description (sanitized admin HTML). `rich-text-inline` strips
              the default <p> margins so it sits flush with the price/title layout. */}
          {hasContent(shortDescriptionHtml) && (
            <div
              className="rich-text rich-text-inline mt-4 text-[18px] md:text-[20px] leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: shortDescriptionHtml }}
            />
          )}

          <div className="mt-6">
            <ProductActions product={product} />
          </div>

          {/* Detail sections */}
          <div className="mt-8">
            <ProductAccordion sections={sections} />
          </div>
        </div>
      </article>

      <ReviewsSection productId={product.id} productTitle={product.title} />
    </div>

    {/* Post-review discovery sections (ProductCarousel brings its own
        max-w-7xl px-4 wrapper, so these sit outside the page container). */}
    <ProductCarousel
      title="Recommended for you"
      products={recommended}
      viewAllHref="/category/best-seller"
    />
    {primaryCategory && (
      <ProductCarousel
        title="Related products"
        products={related}
        viewAllHref={`/category/${primaryCategory.slug}`}
      />
    )}
    </>
  );
}
