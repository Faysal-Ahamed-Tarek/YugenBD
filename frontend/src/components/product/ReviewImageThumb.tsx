"use client";

import { useState } from "react";
import ProductImage from "./ProductImage";
import Lightbox from "@/components/ui/Lightbox";

/** Clickable review photo thumbnail that opens a full-screen lightbox. */
export default function ReviewImageThumb({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View review photo"
        className="relative mt-3 block h-[90px] w-[90px] overflow-hidden rounded-lg bg-surface ring-1 ring-border hover:ring-primary transition-all"
      >
        <ProductImage src={src} alt={alt} sizes="90px" />
      </button>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
