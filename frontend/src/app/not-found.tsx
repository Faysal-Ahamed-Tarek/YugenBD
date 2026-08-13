import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn't exist. Browse our Japanese beauty & personal care collection instead.",
  robots: { index: false, follow: true },
};

/**
 * Root 404 — rendered for any unmatched URL and by `notFound()` (e.g. a product
 * slug that no longer exists). Offers the ways back into the catalogue instead
 * of a dead end.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center md:py-28">
      <p className="text-[88px] font-semibold leading-none tracking-tight text-primary/25 md:text-[124px]">
        404
      </p>

      <h1 className="mt-2 text-2xl font-semibold md:text-3xl">Page not found</h1>
      <p className="mt-1 text-sm font-medium text-primary">পেজটি খুঁজে পাওয়া যায়নি</p>

      <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
        The page you are looking for is no longer available. Let&apos;s get you back to shopping.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/products"
          className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Shop all products
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-8 py-3 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
        >
          Back to home
        </Link>
      </div>

    </div>
  );
}
