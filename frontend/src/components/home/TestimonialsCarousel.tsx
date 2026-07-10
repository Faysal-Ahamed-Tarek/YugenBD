"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TestimonialVideo } from "@/types";

const CARD_SPACING = 78; // horizontal shift per step, in % of card width
const SWIPE_THRESHOLD = 40; // px
const AUTO_SWIPE_MS = 3000;

/**
 * Coverflow-style carousel built with plain CSS transforms — every card's
 * translateX/scale/opacity is derived from its distance to the active
 * index, and a single `transition` animates between states. Looping uses
 * shortest-path offsets so slide 0 sits next to the last slide.
 *
 * Auto-swipes every 3 seconds. While the user has a video playing the
 * timer is suspended, and it resumes once the video finishes.
 *
 * Only the center card ever mounts a <video>; side cards are poster
 * images, so the page downloads one video at most.
 */
export default function TestimonialsCarousel({ items }: { items: TestimonialVideo[] }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const playingRef = useRef(false);
  playingRef.current = playing;
  const count = items.length;

  const goTo = useCallback(
    (index: number, autoplay = false) => {
      setActive(((index % count) + count) % count);
      setPlaying(autoplay);
    },
    [count]
  );

  // Auto-swipe every 3s. Reset the timer whenever the slide changes so a
  // manual navigation always gets a full 3s before the next advance; skip
  // ticks while a video is playing so autoplay never interrupts playback.
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => {
      if (!playingRef.current) {
        setActive((a) => (a + 1) % count);
      }
    }, AUTO_SWIPE_MS);
    return () => clearInterval(id);
  }, [count, active]);

  if (count === 0) return null;

  /** Signed shortest-path distance from the active card (negative = left). */
  const offsetOf = (index: number) => {
    const raw = ((index - active + count + Math.floor(count / 2)) % count) - Math.floor(count / 2);
    return raw;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      goTo(delta < 0 ? active + 1 : active - 1);
    }
  };

  return (
    <div className="relative w-full">
      {/* Stage — height follows the responsive card width (9:16 + breathing room) */}
      <div
        className="relative h-[calc(min(58vw,240px)*16/9_+_48px)] md:h-[620px] overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {items.map((item, i) => {
          const offset = offsetOf(i);
          const distance = Math.abs(offset);
          const isCenter = offset === 0;
          // 5 visible on desktop (±2), 3 on mobile (±1); beyond that hidden.
          const scale = isCenter ? 1 : distance === 1 ? 0.82 : 0.68;
          const opacity = isCenter ? 1 : distance === 1 ? 0.55 : 0.35;

          return (
            <div
              key={item.id}
              onClick={() => !isCenter && goTo(i, true)}
              className={`absolute left-1/2 top-1/2 w-[min(58vw,240px)] md:w-[300px] aspect-[9/16]
                transition-all duration-500 ease-out
                ${isCenter ? "z-20" : distance === 1 ? "z-10 cursor-pointer" : "z-0 cursor-pointer"}
                ${distance >= 2 ? "hidden md:block" : ""}
                ${distance > 2 ? "md:hidden" : ""}`}
              style={{
                transform: `translate(calc(-50% + ${offset * CARD_SPACING}%), -50%) scale(${scale})`,
                opacity,
              }}
              aria-hidden={!isCenter}
            >
              <div
                className={`relative h-full w-full overflow-hidden rounded-2xl bg-surface ${
                  isCenter ? "shadow-2xl ring-1 ring-black/5" : "shadow-md"
                }`}
              >
                {isCenter && playing ? (
                  <>
                    <video
                      key={item.id}
                      src={item.videoUrl}
                      poster={item.posterUrl}
                      autoPlay
                      muted={muted}
                      playsInline
                      onEnded={() => setPlaying(false)}
                      className="h-full w-full object-cover"
                    />
                    {/* Mute / unmute */}
                    <button
                      type="button"
                      aria-label={muted ? "Unmute video" : "Mute video"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMuted((m) => !m);
                      }}
                      className="absolute bottom-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
                    >
                      {muted ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 5L6 9H2v6h4l5 4V5z" />
                          <path d="M22 9l-6 6M16 9l6 6" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 5L6 9H2v6h4l5 4V5z" />
                          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
                        </svg>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <Image
                      src={item.posterUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 58vw, 300px"
                      loading="lazy"
                      className="object-cover"
                    />
                    {/* Play overlay — center card only */}
                    {isCenter && (
                      <button
                        type="button"
                        aria-label={`Play testimonial: ${item.title}`}
                        onClick={() => setPlaying(true)}
                        className="absolute inset-0 z-10 flex items-center justify-center"
                      >
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition-transform hover:scale-110">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M8 5.5v13l11-6.5z" />
                          </svg>
                        </span>
                      </button>
                    )}
                  </>
                )}

                {/* Title strip on center card */}
                {isCenter && (
                  <p className="absolute bottom-0 left-0 right-0 z-[5] bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-sm font-medium text-white pointer-events-none">
                    {item.title}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Circular nav buttons, outside the stage, vertically centered */}
      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => goTo(active - 1)}
        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-lg border border-border hover:text-primary hover:border-primary transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => goTo(active + 1)}
        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-lg border border-border hover:text-primary hover:border-primary transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
