import Link from "next/link";
import Image from "next/image";
import BackToTop from "./BackToTop";
import SocialIcons from "@/components/ui/SocialIcons";
import type { Announcement } from "@/types";

const QUICK_LINKS = [
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Return & Refund", href: "/returns" },
];

/**
 * Three content columns: brand (logo, description, socials, hotline), quick
 * links, and the live announcements. `announcements` comes from the root
 * layout, which already fetches them for the marquee — the footer reuses that
 * result rather than issuing a second request.
 */
export default function Footer({ announcements = [] }: { announcements?: Announcement[] }) {
  return (
    <footer className="mt-12 bg-surface border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand — logo, description, socials, hotline */}
          <div className="lg:col-span-2">
            <Link href="/" className="shrink-0" aria-label="YugenBD home">
              <Image
                src="/manual-images/YugenBdTransparent.png"
                alt="YugenBD"
                width={132}
                height={32}
                priority
                className="h-14 md:h-16 w-auto"
              />
            </Link>
            <p className="mt-3 max-w-sm text-sm md:text-md text-muted leading-relaxed">
              Every product is authentically sourced from Japan with care and intention. We hope
              these J-Beauty essentials bring a little more radiance to your everyday routine.
            </p>

            <div className="mt-5">
              <SocialIcons />
            </div>

            <p className="mt-4 text-sm text-muted">
              Hotline:{" "}
              <a href="tel:+8801778931591" className="hover:text-primary transition-colors">
                01778-931591
              </a>
            </p>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer">
            <p className="text-sm font-semibold uppercase tracking-wider mb-3">Quick Links</p>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Announcements — the same active rows the marquee scrolls */}
          {announcements.length > 0 && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider mb-3">Announcements</p>
              <ul className="space-y-2.5">
                {announcements.map((announcement) => (
                  <li
                    key={announcement.id}
                    className="flex gap-2 text-sm text-muted leading-relaxed"
                  >
                    <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
                      ✦
                    </span>
                    <span>{announcement.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Extra bottom padding on mobile keeps content clear of the fixed bottom nav */}
        <div className="mt-10 border-t border-border pt-5 pb-16 md:pb-0 text-center text-sm text-muted">
          © {new Date().getFullYear()} YugenBD. All rights reserved.
        </div>
      </div>
      <BackToTop />
    </footer>
  );
}
