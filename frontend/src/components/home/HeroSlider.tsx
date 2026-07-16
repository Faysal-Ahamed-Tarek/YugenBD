"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroSlide } from "@/types";

const AUTOPLAY_MS = 5000;

/**
 * Image-only hero carousel inside a centered container. Slides come from the
 * admin-managed API (any number, 1..N). Native horizontal scroll + CSS
 * scroll-snap keeps swiping browser-native and library-free; autoplay simply
 * calls scrollTo() and pauses on hover/touch. The first slide is the LCP image
 * and loads with priority. Renders nothing when there are no active slides.
 */
export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);
  const count = slides.length;

  // Mouse click-and-drag to scroll (PC). Touch keeps native scroll/snap.
  const drag = useRef({ down: false, startX: 0, startScroll: 0 });
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = { down: true, startX: e.clientX, startScroll: track.scrollLeft };
    pausedRef.current = true;
    track.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return;
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = drag.current.startScroll - (e.clientX - drag.current.startX);
  };
  const endDrag = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    pausedRef.current = false;
  };

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track || count === 0) return;
      const clamped = ((index % count) + count) % count;
      track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    },
    [count]
  );

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  useEffect(() => {
    if (count <= 1) return; // nothing to autoplay through
    const id = setInterval(() => {
      if (!pausedRef.current) {
        const track = trackRef.current;
        if (!track) return;
        const current = Math.round(track.scrollLeft / track.clientWidth);
        goTo(current + 1);
      }
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [goTo, count]);

  // No active slides — hide the section entirely (don't render an empty shell).
  if (count === 0) return null;

  return (
    <section aria-label="Featured offers" className="mx-auto max-w-7xl px-4 pt-4 md:pt-6">
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl">
        <div
          ref={trackRef}
          onScroll={onScroll}
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onTouchStart={() => (pausedRef.current = true)}
          onTouchEnd={() => (pausedRef.current = false)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar md:cursor-grab md:active:cursor-grabbing select-none"
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="relative w-full shrink-0 snap-start aspect-[16/9] md:aspect-[16/6]"
            >
              <Image
                src={slide.imageUrl}
                alt={`Promotional banner ${i + 1}`}
                fill
                sizes="(max-width: 1280px) 100vw, 1248px"
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                draggable={false}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Prev / next arrows (loops) — shown when there's more than one slide */}
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goTo(active - 1)}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 inline-flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full bg-background/85 border border-border shadow-md text-foreground hover:text-primary hover:bg-background transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goTo(active + 1)}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 inline-flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full bg-background/85 border border-border shadow-md text-foreground hover:text-primary hover:bg-background transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}

        {/* Dot indicators — only when there's more than one slide */}
        {count > 1 && (
          <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={active === i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  active === i ? "w-6 bg-primary" : "w-2 bg-white/70 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
