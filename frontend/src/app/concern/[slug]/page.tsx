import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConcernBySlug, getProductsPage } from "@/lib/api";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ProductGrid from "@/components/product/ProductGrid";
import LoadMoreProducts from "@/components/product/LoadMoreProducts";
import EmptyProducts from "@/components/product/EmptyProducts";
import { socialMeta, OG_IMAGE } from "@/lib/seo";

const PAGE_SIZE = 16;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const concern = await getConcernBySlug(slug);
  if (!concern) return { title: "Concern not found" };

  const title = `${concern.title} — Shop by Concern`;
  const description = `Products that target ${concern.title.toLowerCase()} at YugenBD — cash on delivery across Bangladesh.`;

  return {
    title,
    description,
    alternates: { canonical: `/concern/${concern.slug}` },
    // The concern's own image is its social share card; fall back to the
    // site-wide one if a concern has no image set.
    ...socialMeta({
      title,
      description,
      url: `/concern/${concern.slug}`,
      images: concern.imageUrl
        ? [{ url: concern.imageUrl, alt: concern.title }]
        : [OG_IMAGE],
    }),
  };
}

export default async function ConcernPage({ params }: PageProps) {
  const { slug } = await params;
  const concern = await getConcernBySlug(slug);
  if (!concern) notFound();

  const { products, pagination } = await getProductsPage({
    concernSlug: slug,
    limit: PAGE_SIZE,
    page: 1,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: concern.title }]} />

      <h1 className="mt-4 text-2xl md:text-3xl font-semibold">{concern.title}</h1>
      {pagination.total > 0 && (
        <p className="mt-1 text-sm text-muted">
          {pagination.total} product{pagination.total === 1 ? "" : "s"} for this concern
        </p>
      )}

      {products.length === 0 ? (
        <EmptyProducts label={concern.title} />
      ) : (
        <div className="mt-6">
          <ProductGrid products={products} />
          <LoadMoreProducts
            params={{ concernSlug: slug, limit: PAGE_SIZE }}
            initialHasMore={pagination.hasMore}
          />
        </div>
      )}
    </div>
  );
}
