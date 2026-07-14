import Link from "next/link";
import Image from "next/image";
import BackToTop from "./BackToTop";
import SocialIcons from "@/components/ui/SocialIcons";

const QUICK_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Track Order", href: "/track-order" },
  { label: "Return Policy", href: "/returns" },
  { label: "Privacy Policy", href: "/privacy" },
];

export default function Footer() {
  return (
    <footer className="mt-12 bg-surface border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="shrink-0" aria-label="YugenBD home">
            <Image
              src="/manual-images/YugenBdTransparent.png"
              alt="YugenBD"
              width={132}
              height={32}
              priority
              className="h-10 md:h-15 w-auto"
            />
          </Link>
            <p className="mt-3 max-w-sm text-sm text-muted leading-relaxed">
              every products is authentically sourced from japan with care and intention. we hope these j-beauty essentials bring a little more radiance to your everyday routine.
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

          {/* Social + contact */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider mb-3">Stay Connected</p>
            <SocialIcons />
            <p className="mt-4 text-sm text-muted">
              Hotline: <a href="tel:+8801700000000" className="hover:text-primary">+880 1700-000000</a>
            </p>
          </div>
        </div>

        {/* Extra bottom padding on mobile keeps content clear of the fixed bottom nav */}
        <div className="mt-10 border-t border-border pt-5 pb-16 md:pb-0 text-center text-xs text-muted">
          © {new Date().getFullYear()} YugenBD. All rights reserved. Cash on delivery nationwide.
        </div>
      </div>
      <BackToTop />
    </footer>
  );
}
