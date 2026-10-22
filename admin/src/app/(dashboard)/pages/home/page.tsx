"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { HeroSlide, Announcement, Category, Product } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SingleImageUpload from "@/components/ui/SingleImageUpload";

const PLACEHOLDER = "/placeholder.svg";

// Curated home-page product sections. Each is backed by a category (seeded by
// migration 0026); a product appears in a section when it's linked to that
// category, so these pickers just add/remove the category on the product.
const PRODUCT_SECTIONS = [
  { slug: "best-seller", title: "Best Selling Products" },
  { slug: "recommended-for-you", title: "Recommended for You" },
] as const;

export default function HomePageAdmin() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Home Page</h1>
        <p className="mt-1 text-sm text-muted">
          Manage the storefront hero slider, announcement bar and featured product sections.
        </p>
      </div>
      <HeroSlidesSection />
      <AnnouncementsSection />
      {PRODUCT_SECTIONS.map((section) => (
        <ProductSectionPicker key={section.slug} slug={section.slug} title={section.title} />
      ))}
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

/* ──────────────────────── Featured product sections ─────────────────────── */

function ProductSectionPicker({ slug, title }: { slug: string; title: string }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, list] = await Promise.all([
        api.get<Category[]>("/categories"),
        api.get<Product[]>(`/products?categorySlug=${slug}&limit=100`),
      ]);
      setCategory(cats.data.find((c) => c.slug === slug) ?? null);
      setProducts(list.data);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced product search for the "add" list.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await api.get<Product[]>(`/products?q=${encodeURIComponent(q)}&limit=8`);
      setResults(res.data);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const setMembership = async (product: Product, add: boolean) => {
    if (!category) return;
    setError(null);
    const current = product.categories.map((c) => c.id);
    const categoryIds = add
      ? Array.from(new Set([...current, category.id]))
      : current.filter((id) => id !== category.id);
    if (categoryIds.length === 0) {
      setError(`"${product.title}" has no other category — give it one on the product page before removing it here.`);
      return;
    }
    setBusyId(product.id);
    try {
      await api.patch(`/products/${product.id}`, { categoryIds });
      if (add) setQuery("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update product.");
    } finally {
      setBusyId(null);
    }
  };

  const selectedIds = new Set(products.map((p) => p.id));

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted">
          Products shown in the &ldquo;{title}&rdquo; section on the home page (up to 8, newest first). Draft
          products are listed here but hidden on the storefront.
        </p>
      </div>

      {!loading && !category ? (
        <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">
          The &ldquo;{slug}&rdquo; category is missing. Run the database migrations to create it.
        </p>
      ) : (
        <>
          <div className="relative mb-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products to add…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {results.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-xl border border-border p-2">
                {results.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
                    <ProductThumb product={p} />
                    <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                    {selectedIds.has(p.id) ? (
                      <span className="text-xs text-muted">Added</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMembership(p, true)}
                        disabled={busyId === p.id}
                        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                      >
                        + Add
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="mb-3 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}

          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : products.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              No products yet — the section is hidden on the home page until you add some.
            </p>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                  <ProductThumb product={p} />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                  {p.status === "draft" && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">Draft</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setMembership(p, false)}
                    disabled={busyId === p.id}
                    aria-label={`Remove ${p.title}`}
                    className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-red-600 disabled:opacity-40"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function ProductThumb({ product }: { product: Product }) {
  return (
    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
      <Image src={product.mainImage?.imageUrl ?? PLACEHOLDER} alt="" fill sizes="40px" className="object-cover" />
    </span>
  );
}
