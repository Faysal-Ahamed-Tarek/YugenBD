import type { Metadata } from "next";
import { getProductsPage } from "@/lib/api";
import type { ProductListParams } from "@/types";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ProductGrid from "@/components/product/ProductGrid";
import LoadMoreProducts from "@/components/product/LoadMoreProducts";
import EmptyProducts from "@/components/product/EmptyProducts";
import { socialMeta } from "@/lib/seo";

const PAGE_SIZE = 16;
const GAP = "gap-x-4 gap-y-8";

const TITLE = "Trending Products";
const DESCRIPTION =
  "Shop trending authentic Japanese skincare, haircare and beauty products in stock now at YugenBD — ready to ship across Bangladesh.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/trending" },
  ...socialMeta({ title: `${TITLE} | YugenBD`, description: DESCRIPTION, url: "/trending" }),
};

/**
 * "Trending Products" — every product currently in stock (stock >= 1). The
 * home and product-page Trending carousels show a random 8 of these; their
 * "View all" links land here. Ordered by the admin-curated shop order (then
 * newest), the same as /products, so paging with Load More stays stable.
 */
export default async function TrendingPage() {
  const query: ProductListParams = { inStock: true, sort: "shop_order", limit: PAGE_SIZE, page: 1 };
  const { products, pagination } = await getProductsPage(query);

  // Params LoadMore reuses for subsequent pages (it adds `page` itself).
  const loadMoreParams: ProductListParams = { ...query };
  delete loadMoreParams.page;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: TITLE }]} />

      <div className="mt-4">
        <h1 className="text-xl md:text-3xl font-semibold">{TITLE}</h1>
        <p className="mt-2 text-sm text-muted">
          {pagination.total} product{pagination.total === 1 ? "" : "s"} in stock
        </p>
      </div>

      <div className="mt-6">
        {products.length === 0 ? (
          <EmptyProducts label="Trending Products" />
        ) : (
          <>
            <ProductGrid products={products} gapClass={GAP} />
            <LoadMoreProducts params={loadMoreParams} initialHasMore={pagination.hasMore} gapClass={GAP} />
          </>
        )}
      </div>
    </div>
  );
}
