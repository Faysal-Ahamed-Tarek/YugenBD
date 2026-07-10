"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

/** Uploads a single image via the shared /uploads endpoint and reports its URL. */
export default function SingleImageUpload({
  value,
  onChange,
  folder = "products",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("images", file);
      form.append("folder", folder);
      const res = await api.upload<{ url: string }[]>("/uploads", form);
      onChange(res.data[0]?.url ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3">
          <span className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-surface">
            <Image src={value} alt="" fill sizes="64px" className="object-cover" />
          </span>
          <button type="button" onClick={() => onChange(null)} className="text-sm text-muted hover:text-primary">
            Remove
          </button>
        </div>
      ) : (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-muted hover:border-primary hover:text-primary transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
          {uploading ? "Uploading…" : "Upload image"}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
      {error && <p className="mt-1 text-sm text-primary">{error}</p>}
    </div>
  );
}
