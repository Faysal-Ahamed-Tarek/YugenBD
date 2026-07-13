import Link from "next/link";
import Image from "next/image";
import { getCategories } from "@/lib/api";
import MobileSidebar from "./MobileSidebar";
import SearchBar from "./SearchBar";
import CartButton from "./CartButton";

/**
 * Server component: categories are fetched on the server so the nav is in
 * the initial HTML (SEO) and costs zero client JS. Only the sidebar toggle
 * and cart badge are client components.
 */
export default async function Header() {
  const categories = await getCategories();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 md:h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0" aria-label="YugenBD home">
            <Image
              src="/manual-images/logo.svg"
              alt="YugenBD"
              width={132}
              height={32}
              priority
              className="h-7 md:h-8 w-auto"
            />
          </Link>

          {/* Desktop search */}
          <div className="hidden md:block flex-1 max-w-md">
            <SearchBar />
          </div>

          {/* Right actions — desktop order: Shop, Cart, Account */}
          <div className="flex items-center gap-1 md:gap-2">
            <Link
              href="/products"
              aria-label="Shop all products"
              className="hidden md:inline-flex p-2 rounded-full text-foreground hover:text-primary hover:bg-primary-light transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16l-1.2 13H5.2L4 7z" />
                <path d="M8.5 7V6a3.5 3.5 0 0 1 7 0v1" />
              </svg>
            </Link>
            <CartButton />
            <Link
              href="/account"
              aria-label="My account"
              className="hidden md:inline-flex p-2 rounded-full text-foreground hover:text-primary hover:bg-primary-light transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
              </svg>
            </Link>
            <MobileSidebar categories={categories} />
          </div>
        </div>

        {/* Desktop category nav. Categories with subcategories reveal a hover
            flyout (pure CSS group-hover — no client JS). Items wrap instead of
            scrolling so the absolute flyout is never clipped. */}
        <nav aria-label="Categories" className="hidden md:block border-t border-border">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-0.5 min-h-11 py-0.5 text-sm font-medium">
            {categories.map((cat) => {
              const children = cat.children ?? [];
              return (
                <li key={cat.id} className="group relative shrink-0">
                  <Link
                    href={`/category/${cat.slug}`}
                    className="inline-flex items-center gap-1 py-2.5 text-foreground hover:text-primary transition-colors"
                  >
                    {cat.name}
                    {children.length > 0 && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted group-hover:text-primary transition-colors">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    )}
                  </Link>
                  {children.length > 0 && (
                    <ul className="absolute left-0 top-full z-50 hidden min-w-44 rounded-xl border border-border bg-background p-1.5 shadow-lg group-hover:block">
                      {children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/category/${child.slug}`}
                            className="block rounded-lg px-3 py-2 text-foreground hover:bg-primary-light hover:text-primary transition-colors"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
