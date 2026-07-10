"use client";

import { useCallback, useRef, useState } from "react";
import type { ProductImage as ProductImageType } from "@/types";
import ProductImage from "./ProductImage";

/**
 * Desktop: main image with clickable thumbnails below.
 * Mobile: native scroll-snap carousel with dot indicators.
 * Both reuse the same ProductImage (next/image + placeholder fallback).
 */
export default function ProductGallery({
  images,
  title,
}: {
  images: ProductImageType[];
  title: string;
}) {
  const gallery = images.length > 0 ? images : [null];
  const [selected, setSelected] = useState(0);
  const [mobileActive, setMobileActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const onTrackScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setMobileActive(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  return (
    <div>
      {/* Mobile: swipeable snap carousel */}
      <div className="relative md:hidden">
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-xl"
          aria-label={`${title} images`}
        >
          {gallery.map((image, i) => (
            <div
              key={image?.id ?? i}
              className="relative w-full shrink-0 snap-start aspect-square bg-surface"
            >
              <ProductImage
                src={image?.imageUrl ?? null}
                alt={`${title} — image ${i + 1}`}
                sizes="100vw"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
        {gallery.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {gallery.map((image, i) => (
              <span
                key={image?.id ?? i}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  mobileActive === i ? "w-5 bg-primary" : "w-1.5 bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: main image + thumbnails */}
      <div className="hidden md:block">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface">
          <ProductImage
            src={gallery[selected]?.imageUrl ?? null}
            alt={title}
            sizes="(max-width: 1280px) 50vw, 620px"
            priority
          />
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-3" role="tablist" aria-label="Product image thumbnails">
            {gallery.map((image, i) => (
              <button
                key={image?.id ?? i}
                type="button"
                role="tab"
                aria-selected={selected === i}
                aria-label={`Show image ${i + 1}`}
                onClick={() => setSelected(i)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface transition-all ${
                  selected === i
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-border opacity-70 hover:opacity-100"
                }`}
              >
                <ProductImage src={image?.imageUrl ?? null} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
