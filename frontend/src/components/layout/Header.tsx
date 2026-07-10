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

        {/* Desktop category nav */}
        <nav aria-label="Categories" className="hidden md:block border-t border-border">
          <ul className="flex items-center gap-6 h-11 text-sm font-medium overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <li key={cat.id} className="shrink-0">
                <Link
                  href={`/category/${cat.slug}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
