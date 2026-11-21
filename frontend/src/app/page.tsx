import type { Metadata } from "next";
import { getProducts, getConcerns, getHeroSlides } from "@/lib/api";
import type { Product } from "@/types";
import HeroSlider from "@/components/home/HeroSlider";
import ShopByConcern from "@/components/home/ShopByConcern";
import ProductCarousel from "@/components/product/ProductCarousel";
import { socialMeta, OG_IMAGE } from "@/lib/seo";

const HOME_TITLE = "YugenBD — Nourish.Renew.Glow";
const HOME_DESCRIPTION =
  "Every product is authentically sourced from Japan with care and intention. We hope these J-Beauty essentials bring a little more radiance to your everyday routine.";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s | YugenBD" title template.
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  ...socialMeta({ title: HOME_TITLE, description: HOME_DESCRIPTION, url: "/" }),
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function buildJsonLd(newArrivals: Product[]) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "YugenBD",
    url: SITE_URL,
    logo: `${SITE_URL}/manual-images/logo.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+8801402933683",
      contactType: "customer service",
      areaServed: "BD",
    },
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "New Arrivals",
    itemListElement: newArrivals.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.title,
        url: `${SITE_URL}/product/${product.slug}`,
        image: product.mainImage?.imageUrl,
        offers: {
          "@type": "Offer",
          priceCurrency: "BDT",
          price: product.discountPrice ?? product.basePrice,
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      },
    })),
  };

  // The home page's featured image, declared for search engines (Google uses
  // structured data, not og:image, when picking a result thumbnail).
  const featuredImage = `${SITE_URL}${OG_IMAGE.url}`;
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: featuredImage,
      width: OG_IMAGE.width,
      height: OG_IMAGE.height,
    },
    image: featuredImage,
  };

  return [organization, webPage, itemList];
}

export default async function HomePage() {
  // All sections fetched in parallel on the server; the page is served as
  // static HTML with 5-minute ISR revalidation.
  const [newArrivals, skincare, haircare, makeup, concerns, heroSlides, bestSellers, trending] = await Promise.all([
    getProducts({ sort: "newest", limit: 8 }),
    getProducts({ categorySlug: "skincare", limit: 8 }),
    getProducts({ categorySlug: "haircare", limit: 8 }),
    getProducts({ categorySlug: "makeup", limit: 8 }),
    getConcerns(),
    getHeroSlides(),
    getProducts({ categorySlug: "best-seller", limit: 8 }),
    getProducts({ inStock: true, limit: 100 }),
  ]);
  // Trending = every in-stock product; the carousel shows 8 at random.

  const jsonLd = buildJsonLd(newArrivals);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="sr-only">
        YugenBD — Beauty &amp; Personal Care with Cash on Delivery in Bangladesh
      </h1>

      <HeroSlider slides={heroSlides} />

      <ShopByConcern concerns={concerns} />

      {bestSellers.length > 0 && (
        <ProductCarousel title="Best Selling Products" products={bestSellers} viewAllHref="/category/best-seller" />
      )}

      {trending.length > 0 && (
        <ProductCarousel title="Trending Products" products={trending} viewAllHref="/products" shuffle />
      )}

      <ProductCarousel title="New Arrivals" products={newArrivals} viewAllHref="/category/new-arrival" />
    </>
  );
}
