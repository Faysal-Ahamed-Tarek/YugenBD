"use client";

import { useCallback, useRef, type ReactNode } from "react";

/**
 * Client shell for a native scroll-snap track. Children are passed in from
 * server components, so product cards stay server-rendered (SEO) while
 * only the arrow logic ships as JS.
 *
 * `itemColsClass` sets the per-item track width (Tailwind auto-cols classes,
 * written as full literals at the call site so the scanner picks them up).
 * Defaults to the 2-up mobile / 4-up desktop sizing used by product rows.
 */
export default function Carousel({
  children,
  label,
  itemColsClass = "auto-cols-[calc(50%-6px)] md:auto-cols-[calc(25%-12px)]",
}: {
  children: ReactNode;
  label: string;
  itemColsClass?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        aria-label={label}
        className={`grid grid-flow-col ${itemColsClass} gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth`}
      >
        {children}
      </ul>

      {/* Arrow controls — desktop only; mobile swipes natively */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollByPage(-1)}
        className="hidden md:inline-flex absolute -left-4 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-background border border-border shadow-md text-foreground hover:text-primary hover:border-primary transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollByPage(1)}
        className="hidden md:inline-flex absolute -right-4 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-background border border-border shadow-md text-foreground hover:text-primary hover:border-primary transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
