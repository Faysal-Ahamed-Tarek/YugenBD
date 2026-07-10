import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getProductsPage } from "@/lib/api";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ProductGrid from "@/components/product/ProductGrid";
import LoadMoreProducts from "@/components/product/LoadMoreProducts";
import EmptyProducts from "@/components/product/EmptyProducts";

const PAGE_SIZE = 16;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };

  return {
    title: `${category.name} Products`,
    description: `Shop ${category.name} products online at YugenBD — authentic picks with cash on delivery across Bangladesh.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { products, pagination } = await getProductsPage({
    categorySlug: slug,
    limit: PAGE_SIZE,
    page: 1,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />

      <h1 className="mt-4 text-2xl md:text-3xl font-semibold">{category.name}</h1>
      {pagination.total > 0 && (
        <p className="mt-1 text-sm text-muted">
          {pagination.total} product{pagination.total === 1 ? "" : "s"}
        </p>
      )}

      {products.length === 0 ? (
        <EmptyProducts label={category.name} />
      ) : (
        <div className="mt-6">
          <ProductGrid products={products} />
          <LoadMoreProducts
            params={{ categorySlug: slug, limit: PAGE_SIZE }}
            initialHasMore={pagination.hasMore}
          />
        </div>
      )}
    </div>
  );
}
