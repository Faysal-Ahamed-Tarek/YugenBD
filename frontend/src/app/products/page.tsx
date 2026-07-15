import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getConcerns, getProductsPage } from "@/lib/api";
import type { ProductListParams } from "@/types";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ProductGrid from "@/components/product/ProductGrid";
import LoadMoreProducts from "@/components/product/LoadMoreProducts";
import EmptyProducts from "@/components/product/EmptyProducts";
import ProductFilters, { type ActiveFilters } from "@/components/product/ProductFilters";
import MobileFilters from "@/components/product/MobileFilters";

const PAGE_SIZE = 16;
const GAP = "gap-x-4 gap-y-8";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readFilters(sp: Record<string, string | string[] | undefined>): ActiveFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return {
    category: one(sp.category),
    concern: one(sp.concern),
    minPrice: one(sp.minPrice),
    maxPrice: one(sp.maxPrice),
    q: one(sp.q),
  };
}

/** Build the API query params from URL filters. */
function toQuery(filters: ActiveFilters): ProductListParams {
  const q: ProductListParams = { limit: PAGE_SIZE, page: 1 };
  if (filters.q) q.search = filters.q;
  if (filters.category) q.categorySlug = filters.category;
  if (filters.concern) q.concernSlug = filters.concern;
  const min = filters.minPrice ? Number(filters.minPrice) : undefined;
  const max = filters.maxPrice ? Number(filters.maxPrice) : undefined;
  if (min !== undefined && !Number.isNaN(min)) q.minPrice = min;
  if (max !== undefined && !Number.isNaN(max)) q.maxPrice = max;
  return q;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const filters = readFilters(await searchParams);
  const [categories, concerns] = await Promise.all([getCategories(), getConcerns()]);
  const catName = categories.find((c) => c.slug === filters.category)?.name;
  const conName = concerns.find((c) => c.slug === filters.concern)?.title;
  const parts = [catName, conName].filter(Boolean);
  const title = parts.length > 0 ? `${parts.join(" · ")} Products` : "Shop All Products";
  return {
    title,
    description: "Browse all beauty and personal care products at YugenBD — cash on delivery across Bangladesh.",
  };
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const filters = readFilters(await searchParams);
  const query = toQuery(filters);

  const [categories, concerns, { products, pagination }] = await Promise.all([
    getCategories(),
    getConcerns(),
    getProductsPage(query),
  ]);

  const catName = categories.find((c) => c.slug === filters.category)?.name;
  const conName = concerns.find((c) => c.slug === filters.concern)?.title;

  // Active filter chips: label + href with that one filter removed.
  const buildHref = (omit: keyof ActiveFilters) => {
    const qs = new URLSearchParams();
    (Object.keys(filters) as (keyof ActiveFilters)[]).forEach((key) => {
      if (key !== omit && filters[key]) qs.set(key, filters[key]!);
    });
    return qs.size > 0 ? `/products?${qs.toString()}` : "/products";
  };

  const chips: { key: keyof ActiveFilters; label: string }[] = [];
  if (filters.q) chips.push({ key: "q", label: `Search: ${filters.q}` });
  if (filters.category) chips.push({ key: "category", label: catName ?? filters.category });
  if (filters.concern) chips.push({ key: "concern", label: conName ?? filters.concern });
  if (filters.minPrice) chips.push({ key: "minPrice", label: `Min ৳${filters.minPrice}` });
  if (filters.maxPrice) chips.push({ key: "maxPrice", label: `Max ৳${filters.maxPrice}` });

  // Params LoadMore reuses for subsequent pages (without page/limit; it adds them).
  const loadMoreParams: ProductListParams = { ...query };
  delete loadMoreParams.page;

  // Remount the filter controls whenever the URL filters change, so their
  // internal form state can't go stale after a soft navigation.
  const filterKey = JSON.stringify(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Products" }]} />

      <div className="mt-4">
        <h1 className="text-xl md:text-3xl font-semibold">
          {filters.q
            ? `Search results for “${filters.q}”`
            : "Authentic Japanese Skincare Products in Bangladesh"}
        </h1>
        {/* Mobile: filter button + count on their own row under the title.
            Desktop: the count (the filter button is lg:hidden). */}
        <div className="mt-2 flex items-center gap-3">
          <MobileFilters
            key={filterKey}
            categories={categories}
            concerns={concerns}
            current={filters}
            activeCount={chips.length}
          />
          <p className="text-sm text-muted">
            {pagination.total} product{pagination.total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Desktop sidebar filters — scrolls with the page (not sticky) */}
        <aside className="hidden lg:block">
          <ProductFilters key={filterKey} categories={categories} concerns={concerns} current={filters} />
        </aside>

        {/* Results */}
        <div>
          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={buildHref(chip.key)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  {chip.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </Link>
              ))}
              <Link href="/products" className="text-xs font-medium text-muted hover:text-primary transition-colors">
                Clear all
              </Link>
            </div>
          )}

          {products.length === 0 ? (
            <EmptyProducts label="this selection" />
          ) : (
            <>
              <ProductGrid products={products} gapClass={GAP} />
              <LoadMoreProducts
                key={filterKey}
                params={loadMoreParams}
                initialHasMore={pagination.hasMore}
                gapClass={GAP}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
