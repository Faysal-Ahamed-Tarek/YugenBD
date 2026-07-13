"use client";

import Image from "next/image";
import { useState } from "react";

const PLACEHOLDER = "/manual-images/product-placeholder.jpg";

/**
 * next/image with a graceful fallback to the local placeholder when the
 * remote (Cloudinary) image is missing or fails to load.
 */
export default function ProductImage({
  src,
  alt,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
  fit = "cover",
}: {
  src: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  // "cover" crops to fill the box (default, product cards); "contain" shows the
  // whole image with no cropping (used for concern cards).
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? PLACEHOLDER : src;

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setFailed(true)}
      className={`${fit === "contain" ? "object-contain" : "object-cover"} transition-transform duration-300 group-hover:scale-105`}
    />
  );
}
