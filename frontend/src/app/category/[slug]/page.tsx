import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getProductsPage } from "@/lib/api";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ProductGrid from "@/components/product/ProductGrid";
import LoadMoreProducts from "@/components/product/LoadMoreProducts";
import EmptyProducts from "@/components/product/EmptyProducts";

const PAGE_SIZE = 16;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ subcategory?: string }>;
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

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { subcategory } = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const children = category.children ?? [];
  const isParentWithChildren = !category.parentId && children.length > 0;

  // The active subcategory chip (only meaningful on a parent page). An unknown
  // ?subcategory value falls back to "All". When a child is active we filter by
  // its slug; otherwise by the parent slug, which the API expands to the parent
  // plus all its children.
  const activeChild = isParentWithChildren
    ? children.find((c) => c.slug === subcategory)
    : undefined;
  const effectiveSlug = activeChild ? activeChild.slug : slug;

  const { products, pagination } = await getProductsPage({
    categorySlug: effectiveSlug,
    limit: PAGE_SIZE,
    page: 1,
  });

  // Home / Parent / Subcategory when viewing a child directly; else Home / Category.
  const breadcrumbs =
    category.parentId && category.parent
      ? [
          { label: "Home", href: "/" },
          { label: category.parent.name, href: `/category/${category.parent.slug}` },
          { label: category.name },
        ]
      : [{ label: "Home", href: "/" }, { label: category.name }];

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <Breadcrumbs items={breadcrumbs} />

      <h1 className="mt-4 text-2xl md:text-3xl font-semibold">{category.name}</h1>
      {pagination.total > 0 && (
        <p className="mt-1 text-sm text-muted">
          {pagination.total} product{pagination.total === 1 ? "" : "s"}
        </p>
      )}

      {/* Subcategory filter bar — only on a top-level category that has children.
          "All" shows parent + all children combined; a chip narrows to one child. */}
      {isParentWithChildren && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by subcategory">
          <FilterChip href={`/category/${slug}`} active={!activeChild} label="All" />
          {children.map((child) => (
            <FilterChip
              key={child.id}
              href={`/category/${slug}?subcategory=${child.slug}`}
              active={activeChild?.id === child.id}
              label={child.name}
            />
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <EmptyProducts label={activeChild?.name ?? category.name} />
      ) : (
        <div className="mt-6">
          <ProductGrid products={products} />
          <LoadMoreProducts
            params={{ categorySlug: effectiveSlug, limit: PAGE_SIZE }}
            initialHasMore={pagination.hasMore}
          />
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border text-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}
