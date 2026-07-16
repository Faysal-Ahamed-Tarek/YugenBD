"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

/**
 * Header logo. Navigates home from any page; when already on the home page it
 * smooth-scrolls back to the top instead (a plain Link to the current route
 * would do nothing).
 */
export default function LogoLink() {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      className="shrink-0"
      aria-label="YugenBD home"
      onClick={(e) => {
        if (pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    >
      <Image
        src="/manual-images/YugenBdTransparent.png"
        alt="YugenBD"
        width={132}
        height={32}
        priority
        className="h-10 md:h-10 w-auto"
      />
    </Link>
  );
}
