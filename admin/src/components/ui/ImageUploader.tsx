"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export interface EditableImage {
  id?: string;
  imageUrl: string;
  isMain: boolean;
  sortOrder: number;
}

/**
 * Multi-image manager. In "local" mode (create) it holds images in state and
 * reports them via onChange. In "managed" mode (edit, productId set) every
 * action persists immediately through the product image endpoints, then
 * calls onRefresh. Uploading goes through the shared /uploads endpoint.
 */
export default function ImageUploader({
  images,
  onChange,
  productId,
  onRefresh,
  folder = "products",
}: {
  images: EditableImage[];
  onChange?: (images: EditableImage[]) => void;
  productId?: string;
  onRefresh?: () => void;
  folder?: string;
}) {
  const managed = Boolean(productId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reindex = (list: EditableImage[]) => list.map((img, i) => ({ ...img, sortOrder: i }));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("images", f));
      form.append("folder", folder);
      const res = await api.upload<{ url: string; publicId: string }[]>("/uploads", form);
      const urls = res.data.map((u) => u.url);

      if (managed && productId) {
        await api.post(`/products/${productId}/images`, {
          images: urls.map((url, i) => ({
            imageUrl: url,
            isMain: images.length === 0 && i === 0,
            sortOrder: images.length + i,
          })),
        });
        onRefresh?.();
      } else {
        const added = urls.map((url, i) => ({
          imageUrl: url,
          isMain: images.length === 0 && i === 0,
          sortOrder: images.length + i,
        }));
        onChange?.(reindex([...images, ...added]));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const setMain = async (img: EditableImage) => {
    if (managed && productId && img.id) {
      await api.patch(`/products/${productId}/images/${img.id}/main`);
      onRefresh?.();
    } else {
      onChange?.(images.map((i) => ({ ...i, isMain: i === img })));
    }
  };

  const remove = async (img: EditableImage) => {
    if (managed && productId && img.id) {
      await api.del(`/products/${productId}/images/${img.id}`);
      onRefresh?.();
    } else {
      onChange?.(reindex(images.filter((i) => i !== img)));
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    const reindexed = reindex(next);
    if (managed && productId) {
      await api.patch(`/products/${productId}/images/reorder`, {
        imageIds: reindexed.map((i) => i.id),
      });
      onRefresh?.();
    } else {
      onChange?.(reindexed);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((img, index) => (
          <div key={img.id ?? img.imageUrl} className="relative w-24">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-surface">
              <Image src={img.imageUrl} alt="" fill sizes="96px" className="object-cover" />
              {img.isMain && (
                <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Main
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-muted">
              <button type="button" aria-label="Move left" onClick={() => move(index, -1)} className="hover:text-primary disabled:opacity-30" disabled={index === 0}>
                ‹
              </button>
              {!img.isMain && (
                <button type="button" onClick={() => setMain(img)} className="text-[11px] hover:text-primary">
                  Set main
                </button>
              )}
              <button type="button" aria-label="Move right" onClick={() => move(index, 1)} className="hover:text-primary disabled:opacity-30" disabled={index === images.length - 1}>
                ›
              </button>
            </div>
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => remove(img)}
              className="absolute -top-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs"
            >
              ×
            </button>
          </div>
        ))}

        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border text-muted hover:border-primary hover:text-primary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="mt-1 text-[11px]">{uploading ? "Uploading…" : "Add"}</span>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-primary">{error}</p>}
    </div>
  );
}
