"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Client shell for a native scroll-snap track. Children are passed in from
 * server components, so product cards stay server-rendered (SEO) while
 * only the arrow logic ships as JS.
 *
 * `itemColsClass` sets the per-item track width (Tailwind auto-cols classes,
 * written as full literals at the call site so the scanner picks them up).
 * Defaults to the 2-up mobile / 4-up desktop sizing used by product rows.
 *
 * Arrows are CONDITIONAL: the left arrow only appears when there's content
 * scrolled off to the left, the right arrow only when content remains to the
 * right. If everything fits, neither shows. Recomputed on scroll/resize.
 * `mobileArrows` also shows the arrows on mobile (otherwise desktop-only).
 */
export default function Carousel({
  children,
  label,
  itemColsClass = "auto-cols-[calc(50%-6px)] md:auto-cols-[calc(25%-12px)]",
  mobileArrows = false,
}: {
  children: ReactNode;
  label: string;
  itemColsClass?: string;
  mobileArrows?: boolean;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  const arrowBase = `${mobileArrows ? "inline-flex" : "hidden md:inline-flex"} absolute top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-background border border-border shadow-md text-foreground hover:text-primary hover:border-primary transition-colors z-10`;

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        aria-label={label}
        className={`grid grid-flow-col ${itemColsClass} gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth py-3`}
      >
        {children}
      </ul>

      {/* Arrows render only when there is content to scroll to in that direction. */}
      {canLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByPage(-1)}
          className={`${arrowBase} -left-4`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByPage(1)}
          className={`${arrowBase} -right-4`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
