"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface Slide {
  image: string;
  alt: string;
}

const SLIDES: Slide[] = [
  { image: "/manual-images/hero-1.jpg", alt: "Skincare collection — cash on delivery across Bangladesh" },
  { image: "/manual-images/hero-2.jpg", alt: "Haircare essentials — up to 20% off this week" },
  { image: "/manual-images/hero-3.jpg", alt: "Everyday makeup essentials" },
  { image: "/manual-images/hero-4.jpg", alt: "Men's grooming collection" },
];

const AUTOPLAY_MS = 5000;

/**
 * Image-only hero carousel inside a centered container. Native horizontal
 * scroll + CSS scroll-snap keeps swiping browser-native and library-free;
 * autoplay simply calls scrollTo() and pauses on hover/touch. The first
 * slide is the LCP image and loads with priority.
 */
export default function HeroSlider() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = ((index % SLIDES.length) + SLIDES.length) % SLIDES.length;
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  }, []);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) {
        const track = trackRef.current;
        if (!track) return;
        const current = Math.round(track.scrollLeft / track.clientWidth);
        goTo(current + 1);
      }
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [goTo]);

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
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {SLIDES.map((slide, i) => (
            <div
              key={slide.image}
              className="relative w-full shrink-0 snap-start aspect-[16/9] max-h-[440px] md:aspect-[21/8]"
            >
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                sizes="(max-width: 1280px) 100vw, 1248px"
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.image}
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
      </div>
    </section>
  );
}
