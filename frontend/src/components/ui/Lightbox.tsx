"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const PLACEHOLDER = "/manual-images/product-placeholder.jpg";

/**
 * Full-screen image lightbox, portaled to <body>. Closes on any click outside
 * the photo itself, the ✕ button, or Escape. Falls back to the shared placeholder on error.
 * Pass `onPrev`/`onNext` to show gallery arrows (also ←/→ keys).
 */
export default function Lightbox({
  src,
  alt,
  onClose,
  onPrev,
  onNext,
  caption,
}: {
  src: string;
  alt: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** Optional small label under the image, e.g. "2 / 5". */
  caption?: string;
}) {
  // Tracks WHICH src failed, so the next image in gallery mode gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev?.();
      else if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
    >
      <button
        type="button"
        aria-label="Close image"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {/* Sized to the photo itself, so a click anywhere around it closes. */}
      <Image
        src={failed ? PLACEHOLDER : src}
        alt={alt}
        width={1200}
        height={1200}
        sizes="(max-width: 768px) 100vw, 768px"
        onError={() => setFailedSrc(src)}
        onClick={(e) => e.stopPropagation()}
        className="h-auto max-h-[85vh] w-auto max-w-[min(100%,48rem)] object-contain"
      />
      {onPrev && (
        <button
          type="button"
          aria-label="Previous image"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}
      {onNext && (
        <button
          type="button"
          aria-label="Next image"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
      {caption && (
        <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-foreground">
          {caption}
        </p>
      )}
    </div>,
    document.body
  );
}
