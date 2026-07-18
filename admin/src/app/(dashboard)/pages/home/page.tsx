"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { HeroSlide, Announcement } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SingleImageUpload from "@/components/ui/SingleImageUpload";

export default function HomePageAdmin() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Home Page</h1>
        <p className="mt-1 text-sm text-muted">Manage the storefront hero slider and announcement bar.</p>
      </div>
      <HeroSlidesSection />
      <AnnouncementsSection />
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

/* ─────────────────────────── Announcement bar ──────────────────────────── */

function AnnouncementsSection() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Announcement[]>("/announcements/all");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (a: Announcement) => {
    await api.patch(`/announcements/${a.id}`, { isActive: !a.isActive });
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setItems(reordered); // optimistic
    await api.patch("/announcements/reorder", { ids: reordered.map((a) => a.id) });
    load();
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Announcement Bar</h2>
          <p className="text-sm text-muted">
            Scrolling messages shown just under the hero (offers, promos). Only active messages appear.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          + Add Message
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          No announcements yet. Add one to show the bar.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((a, i) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="text-xs text-muted">#{i + 1}</span>
              <p className="min-w-0 flex-1 truncate text-sm">{a.text}</p>
              <div className="flex flex-none items-center gap-1.5">
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
                  disabled={i === items.length - 1}
                  aria-label="Move down"
                  className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-primary disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(a)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    a.isActive ? "bg-green-100 text-green-700" : "bg-surface text-muted"
                  }`}
                >
                  {a.isActive ? "Active" : "Hidden"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(a)}
                  className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-red-600"
                  aria-label="Delete announcement"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <AnnouncementModal
          item={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete announcement"
        message={`Delete "${toDelete?.text}"?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/announcements/${toDelete.id}`);
            load();
          }
        }}
      />
    </section>
  );
}

function AnnouncementModal({
  item,
  onClose,
  onSaved,
}: {
  item: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState(item?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    if (text.trim().length < 2) return setError("Message is too short.");
    setSaving(true);
    try {
      if (item) {
        await api.patch(`/announcements/${item.id}`, { text: text.trim() });
      } else {
        await api.post("/announcements", { text: text.trim() });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={item ? "Edit Message" : "Add Message"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Message</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="e.g. ৩,০০০ টাকার বেশি কেনাকাটায় ফ্রি ডেলিভারি!"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted">Shown in the scrolling bar under the hero. Emoji allowed.</p>
        </div>
        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
