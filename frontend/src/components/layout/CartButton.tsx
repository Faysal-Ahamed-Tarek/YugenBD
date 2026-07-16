"use client";

import { useEffect, useState } from "react";
import { getCartCount } from "@/lib/cart";
import CartSidebar from "./CartSidebar";

export default function CartButton() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => setCount(getCartCount());
    update();
    window.addEventListener("cart:updated", update);
    return () => window.removeEventListener("cart:updated", update);
  }, []);

  // Other components (e.g. the mobile BottomNav cart tab) open the drawer by
  // dispatching "cart:open" — same window-event pattern as "cart:updated".
  useEffect(() => {
    const openDrawer = () => setOpen(true);
    window.addEventListener("cart:open", openDrawer);
    return () => window.removeEventListener("cart:open", openDrawer);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label={`Cart, ${count} items`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="relative flex flex-col items-center gap-0.5 p-2 md:p-0 rounded-full md:rounded-none text-[11px] font-medium text-foreground hover:text-primary hover:bg-primary-light md:hover:bg-transparent transition-colors"
      >
        <span className="relative inline-flex">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 7h12l1.2 13H4.8L6 7z" />
            <path d="M9 9V6a3 3 0 0 1 6 0v3" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-semibold leading-none">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </span>
        <span className="hidden md:block md:text-[15px]">Cart</span>
      </button>

      <CartSidebar open={open} onClose={() => setOpen(false)} />
    </>
  );
}
