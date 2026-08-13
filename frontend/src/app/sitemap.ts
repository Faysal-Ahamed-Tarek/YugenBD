import type { MetadataRoute } from "next";
import { getCategories, getConcerns, getProductsPage } from "@/lib/api";
import type { Category } from "@/types";

// Regenerate the sitemap on the same cadence as the ISR pages it lists.
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// The API caps `limit` at 100, so walk pages. The cap is a safety net against
// an unbounded catalogue blowing up the build — raise it if the catalogue grows
// past ~2000 products (a sitemap file may hold 50,000 URLs).
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/** Only the routes worth indexing — cart/checkout/account/auth are noindex. */
const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/products", changeFrequency: "daily", priority: 0.9 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/returns", changeFrequency: "yearly", priority: 0.3 },
];

/** Flatten the one-level category tree (parents + their children). */
function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...(category.children ?? [])]);
}

/** Every published product, walked page by page. Stops on an empty/failed page. */
async function getAllProducts() {
  const products = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { products: batch, pagination } = await getProductsPage({
      page,
      limit: PAGE_SIZE,
      sort: "newest",
    });
    products.push(...batch);
    if (batch.length === 0 || !pagination.hasMore) break;
  }
  return products;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Fetched in parallel; each helper already swallows backend errors and
  // returns an empty list, so a flaky API yields a smaller sitemap, not a
  // failed build.
  const [products, categories, concerns] = await Promise.all([
    getAllProducts(),
    getCategories(),
    getConcerns(),
  ]);

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...flattenCategories(categories).map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...concerns.map((concern) => ({
      url: `${SITE_URL}/concern/${concern.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      // Products are linked by slug, never id.
      url: `${SITE_URL}/product/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
