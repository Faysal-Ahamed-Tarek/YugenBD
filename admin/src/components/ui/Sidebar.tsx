"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { OrderCounts } from "@/lib/types";

interface NavChild {
  label: string;
  href: string;
}
interface NavItem {
  label: string;
  icon: string;
  href?: string;
  children?: NavChild[];
}

// A single config drives the nav. Add `children` to make an item an expandable
// section (e.g. "Pages" → "Home"); add more children later with no code change.
const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" },
  { label: "Products", href: "/products", icon: "M4 7h16l-1.2 13H5.2L4 7zM8.5 7V6a3.5 3.5 0 0 1 7 0v1" },
  { label: "Categories", href: "/categories", icon: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z" },
  { label: "Concerns", href: "/concerns", icon: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" },
  { label: "Orders", href: "/orders", icon: "M6 7h12l1 13H5L6 7zM9 7V5a3 3 0 0 1 6 0v2" },
  { label: "Shipment", href: "/shipment", icon: "M3 7h11v8H3zM14 10h4l3 3v2h-7z M7 17.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M17 17.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z" },
  { label: "Delivery", href: "/delivery", icon: "M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0zM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  { label: "Users", href: "/users", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0" },
  { label: "Reviews", href: "/reviews", icon: "M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3z" },
  {
    label: "Pages",
    icon: "M6 3h9l5 5v13H6zM15 3v5h5M9 13h6M9 17h6",
    children: [
      { label: "Home", href: "/pages/home" },
      { label: "FAQ", href: "/pages/faq" },
    ],
  },
  { label: "Settings", href: "/settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L2.6 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1L9.5 21h5l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z" },
];

/** How often the sidebar re-checks for new pending orders. */
const PENDING_POLL_MS = 30_000;

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Pending-order count badge on the Orders item — the sidebar is mounted on
  // every admin page, so a new order surfaces wherever the admin happens to be.
  const [pending, setPending] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get<OrderCounts>("/orders/counts");
        if (!cancelled) setPending(res.data.pending);
      } catch {
        /* badge is informational — keep the last known value */
      }
    };
    load();
    const timer = setInterval(load, PENDING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Sections start open when they contain the active route; the user can also
  // toggle them.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(NAV.filter((i) => i.children?.some((c) => isActive(c.href))).map((i) => i.label))
  );
  const toggle = (label: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  const icon = (d: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Same wordmark as the login screen and the storefront — the logo IS the
          brand here; only "Admin" is added to mark the surface. */}
      <div className="flex justify-center items-center h-16 border-b border-border">
  <Image
    src="/logo.png"
    alt="YugenBD"
    width={843}
    height={560}
    priority
    className="h-10 w-auto"
  />
</div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {NAV.map((item) => {
            if (item.children) {
              const expanded = open.has(item.label);
              const sectionActive = item.children.some((c) => isActive(c.href));
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggle(item.label)}
                    aria-expanded={expanded}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      sectionActive ? "text-primary" : "text-foreground hover:bg-surface"
                    }`}
                  >
                    {icon(item.icon)}
                    {item.label}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`ml-auto transition-transform ${expanded ? "rotate-180" : ""}`}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {expanded && (
                    <ul className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              isActive(child.href) ? "bg-primary-light text-primary" : "text-foreground hover:bg-surface"
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item.href!) ? "bg-primary-light text-primary" : "text-foreground hover:bg-surface"
                  }`}
                >
                  {icon(item.icon)}
                  {item.label}
                  {item.href === "/orders" && pending > 0 && (
                    <span
                      title={`${pending} pending order${pending > 1 ? "s" : ""}`}
                      className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
                    >
                      {pending > 99 ? "99+" : pending}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted truncate">{user?.email}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
