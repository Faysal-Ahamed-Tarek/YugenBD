/**
 * Zero-JS search: a plain GET form that navigates to /search?q=…
 * Works before hydration and costs nothing in the bundle.
 */
export default function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  return (
    <form action="/search" role="search" className="relative">
      <input
        type="search"
        name="q"
        placeholder="Search products…"
        autoFocus={autoFocus}
        className="w-full h-10 rounded-full border border-border bg-surface pl-4 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-1 top-1 h-8 w-8 inline-flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
