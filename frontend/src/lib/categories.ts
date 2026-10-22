import type { Category } from "@/types";

// Curated home-page section categories (admin picks their products). They stay
// reachable at /category/<slug> via the home "View all" links but are kept out
// of the header / mobile category nav.
const HIDDEN_NAV_CATEGORY_SLUGS = new Set(["best-seller", "new-arrival", "recommended-for-you"]);

export function navCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !HIDDEN_NAV_CATEGORY_SLUGS.has(c.slug));
}
