"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { HeroSlide, TestimonialVideo } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SingleImageUpload from "@/components/ui/SingleImageUpload";

export default function HomePageAdmin() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Home Page</h1>
        <p className="mt-1 text-sm text-muted">Manage the storefront hero slider and video testimonials.</p>
      </div>
      <HeroSlidesSection />
      <TestimonialsSection />
    </div>
  );
}

/* ──────────────────────────── Hero slides ──────────────────────────── */

function HeroSlidesSection() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<HeroSlide | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<HeroSlide[]>("/hero-slides/all");
      setSlides(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addSlide = async (imageUrl: string | null) => {
    if (!imageUrl) return;
    setError(null);
    try {
      await api.post("/hero-slides", { imageUrl });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add slide.");
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    await api.patch(`/hero-slides/${slide.id}`, { isActive: !slide.isActive });
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setSlides(reordered); // optimistic
    await api.patch("/hero-slides/reorder", { ids: reordered.map((s) => s.id) });
    load();
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Hero Slider</h2>
          <p className="text-sm text-muted">Shown at the top of the home page. Only active slides appear.</p>
        </div>
        <SingleImageUpload value={null} onChange={addSlide} folder="hero" />
      </div>

      {error && <p className="mb-3 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : slides.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          No slides yet. Upload an image to add the first one.
        </p>
      ) : (
        <ul className="space-y-2">
          {slides.map((slide, i) => (
            <li key={slide.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
              <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-surface">
                <Image src={slide.imageUrl} alt="" fill sizes="96px" className="object-cover" />
              </span>
              <span className="text-xs text-muted">#{i + 1}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-primary disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === slides.length - 1}
                  aria-label="Move down"
                  className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-primary disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(slide)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    slide.isActive ? "bg-green-100 text-green-700" : "bg-surface text-muted"
                  }`}
                >
                  {slide.isActive ? "Active" : "Hidden"}
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(slide)}
                  className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-red-600"
                  aria-label="Delete slide"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete slide"
        message="Remove this hero slide?"
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/hero-slides/${toDelete.id}`);
            load();
          }
        }}
      />
    </section>
  );
}

/* ─────────────────────────── Testimonials ──────────────────────────── */

// Derive the storefront video + poster URLs from a raw Cloudinary video URL,
// applying the same vertical-crop transform + poster frame the seeder uses.
function deriveTestimonialUrls(secureUrl: string): { videoUrl: string; posterUrl: string } {
  const marker = "/upload/";
  const idx = secureUrl.indexOf(marker);
  if (idx === -1) return { videoUrl: secureUrl, posterUrl: secureUrl };
  const head = secureUrl.slice(0, idx + marker.length);
  const tail = secureUrl.slice(idx + marker.length);
  const videoUrl = `${head}c_fill,ar_9:16,w_540,q_auto/${tail}`;
  const posterUrl = `${head}so_2,f_jpg/${tail.replace(/\.[a-zA-Z0-9]+$/, ".jpg")}`;
  return { videoUrl, posterUrl };
}

function TestimonialsSection() {
  const [items, setItems] = useState<TestimonialVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<TestimonialVideo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<TestimonialVideo[]>("/testimonials/all");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (t: TestimonialVideo) => {
    await api.patch(`/testimonials/${t.id}`, { isActive: !t.isActive });
    load();
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Video Testimonials</h2>
          <p className="text-sm text-muted">Vertical customer videos shown on the home page.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          + Add Video
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          No testimonial videos yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
              <span className="relative h-16 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                <Image src={t.posterUrl} alt="" fill sizes="40px" className="object-cover" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.title}</p>
                {t.description && <p className="truncate text-xs text-muted">{t.description}</p>}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleActive(t)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    t.isActive ? "bg-green-100 text-green-700" : "bg-surface text-muted"
                  }`}
                >
                  {t.isActive ? "Active" : "Hidden"}
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(t)}
                  className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-red-600"
                  aria-label="Delete testimonial"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <TestimonialModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete testimonial"
        message={`Delete "${toDelete?.title}"?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/testimonials/${toDelete.id}`);
            load();
          }
        }}
      />
    </section>
  );
}

function TestimonialModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const derived = rawVideoUrl ? deriveTestimonialUrls(rawVideoUrl) : null;

  const handleVideo = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("video", file);
      // The video endpoint returns a single object ({ url, publicId }).
      const res = await api.upload<{ url: string; publicId: string }>("/uploads/video", form);
      setRawVideoUrl(res.data.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Video upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError(null);
    if (title.trim().length < 1) return setError("Title is required.");
    if (!derived) return setError("Please upload a video.");
    setSaving(true);
    try {
      await api.post("/testimonials", {
        title: title.trim(),
        description: description.trim() || undefined,
        videoUrl: derived.videoUrl,
        posterUrl: derived.posterUrl,
        isActive,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Add Video Testimonial" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Video</label>
          {derived ? (
            <div className="flex items-center gap-3">
              <span className="relative h-20 w-12 overflow-hidden rounded-lg border border-border bg-surface">
                <Image src={derived.posterUrl} alt="" fill sizes="48px" className="object-cover" />
              </span>
              <button type="button" onClick={() => setRawVideoUrl(null)} className="text-sm text-muted hover:text-primary">
                Replace
              </button>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-muted hover:border-primary hover:text-primary transition-colors">
              {uploading ? "Uploading…" : "Upload video (MP4/MOV/WEBM)"}
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => handleVideo(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          <p className="mt-1 text-xs text-muted">Cropped to a vertical 9:16 frame automatically; poster generated from the video.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-primary" />
          Active (show on the home page)
        </label>
        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || uploading}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
