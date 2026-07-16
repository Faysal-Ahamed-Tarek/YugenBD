"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCartCount } from "@/lib/cart";

const SHOW_AFTER_SCROLL_PX = 120;

interface NavItem {
  label: string;
  href?: string;
  // Non-navigation action rendered as a button instead of a link.
  action?: "scrollTop" | "openCart";
  icon: React.ReactNode;
}

const ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    label: "All products",
    href: "/products",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
    ),
  },
  {
    label: "Cart",
    action: "openCart",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
        <path d="M3 4h2l2.6 12h10.2L20 8H6" />
      </svg>
    ),
  },
  {
    label: "Account",
    href: "/account",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
      </svg>
    ),
  },
  {
    label: "Top",
    action: "scrollTop",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ),
  },
];

/**
 * Mobile-only app-style bottom navigation. Hidden at the top of the page,
 * it slides up once the user scrolls and stays fixed at the bottom.
 * Desktop never sees it (md:hidden).
 */
export default function BottomNav() {
  const [visible, setVisible] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_SCROLL_PX);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const update = () => setCartCount(getCartCount());
    update();
    window.addEventListener("cart:updated", update);
    return () => window.removeEventListener("cart:updated", update);
  }, []);

  return (
    <nav
      aria-label="Mobile navigation"
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map((item) => {
          const isActive = Boolean(item.href) && pathname === item.href;
          const inner = (
            <>
              <span className="relative">
                {item.icon}
                {item.label === "Cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-semibold leading-none">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              {item.label}
            </>
          );
          const className = `relative flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            isActive ? "text-primary" : "text-muted hover:text-primary"
          }`;
          return (
            <li key={item.label} className="flex-1">
              {item.action ? (
                <button
                  type="button"
                  onClick={() =>
                    item.action === "openCart"
                      ? window.dispatchEvent(new CustomEvent("cart:open"))
                      : window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className={className}
                >
                  {inner}
                </button>
              ) : (
                <Link href={item.href!} aria-current={isActive ? "page" : undefined} className={className}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
