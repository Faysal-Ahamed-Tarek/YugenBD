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
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${
        // Hiding travels an extra 2.5rem past the bar's own height: the raised
        // cart button overhangs the top edge and would otherwise stay on screen.
        visible ? "translate-y-0" : "translate-y-[calc(100%+2.5rem)]"
      }`}
    >
      {/*
        The bar's surface is its own layer so the notch can be masked out of it:
        a CSS mask applies to an element's whole painted subtree, so masking the
        <nav> itself would take a bite out of the cart button too. The hole is a
        36px-radius circle centred on the button (50% across, 8px down from the
        top edge), leaving an even 8px gap around the 56px button.
      */}
      <div
        aria-hidden
        className="absolute inset-0 bg-background/95 backdrop-blur border-t border-border [mask-image:radial-gradient(circle_36px_at_50%_8px,transparent_0_36px,black_37px)] [-webkit-mask-image:radial-gradient(circle_36px_at_50%_8px,transparent_0_36px,black_37px)]"
      />

      <ul className="relative flex items-stretch justify-around">
        {ITEMS.map((item) => {
          const isActive = Boolean(item.href) && pathname === item.href;
          const isCart = item.label === "Cart";

          const badge = cartCount > 0 && (
            <span
              className={`absolute inline-flex items-center justify-center rounded-full text-[10px] font-semibold leading-none ${
                isCart
                  ? // Sits on the circle's rim rather than off its bounding box.
                    "top-0 right-0 min-w-[18px] h-[18px] px-1 bg-foreground text-white ring-2 ring-background"
                  : "-top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-primary text-white"
              }`}
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          );

          // The cart is a solid circle straddling the bar's top edge, with the
          // icon over its label so the two read as one unit. Separation comes
          // from the notch masked out of the bar behind it — no ring or shadow.
          const inner = isCart ? (
            <span className="relative -mt-7 inline-flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-white transition-transform duration-200 active:scale-95 [&_svg]:h-[23px] [&_svg]:w-[23px]">
              {item.icon}
              <span className="text-[9px] font-semibold leading-none tracking-wide">{item.label}</span>
              {badge}
            </span>
          ) : (
            <>
              <span className="relative">{item.icon}</span>
              {item.label}
            </>
          );

          const className = `relative flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            isCart
              ? "text-foreground"
              : isActive
                ? "text-primary"
                : "text-muted hover:text-primary"
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
