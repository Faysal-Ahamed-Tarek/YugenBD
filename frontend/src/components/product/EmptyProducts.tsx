import Link from "next/link";

/** Friendly empty state shown when a category/concern has no products yet. */
export default function EmptyProducts({ label }: { label: string }) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-14 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16l-1.5 13h-13L4 7z" />
          <path d="M8 10V6a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <h2 className="mt-4 text-lg font-semibold">No products in {label} yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        We&apos;re still stocking this collection. Check back soon — or explore the rest of the store.
      </p>
      <Link
        href="/"
        className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
      >
        Continue shopping
      </Link>
    </div>
  );
}
