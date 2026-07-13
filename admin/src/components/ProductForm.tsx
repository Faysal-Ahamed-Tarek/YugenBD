"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Category, Concern, Product } from "@/lib/types";
import ImageUploader, { type EditableImage } from "@/components/ui/ImageUploader";
import RichTextEditor from "@/components/ui/RichTextEditor";

interface DetailProduct extends Product {
  concerns?: { id: string; title: string; slug: string }[];
}

export default function ProductForm({ initial }: { initial?: DetailProduct }) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [categories, setCategories] = useState<Category[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? "");
  const [discountPrice, setDiscountPrice] = useState(initial?.discountPrice ?? "");
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [whoIsItBestFor, setWhoIsItBestFor] = useState(initial?.whoIsItBestFor ?? "");
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? "");
  const [usageInstructions, setUsageInstructions] = useState(initial?.usageInstructions ?? "");
  const [additionInformation, setAdditionInformation] = useState(initial?.additionInformation ?? "");
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(
    new Set(initial?.categories.map((c) => c.id) ?? [])
  );
  const [concernIds, setConcernIds] = useState<Set<string>>(
    new Set(initial?.concerns?.map((c) => c.id) ?? [])
  );
  const [images, setImages] = useState<EditableImage[]>(
    (initial?.images ?? []).map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      isMain: img.isMain,
      sortOrder: img.sortOrder,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/categories").then((r) => setCategories(r.data));
    api.get<Concern[]>("/concerns").then((r) => setConcerns(r.data));
  }, []);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const refetchImages = async () => {
    if (!initial) return;
    const r = await api.get<DetailProduct>(`/products/${initial.id}`);
    setImages(
      (r.data.images ?? []).map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isMain: img.isMain,
        sortOrder: img.sortOrder,
      }))
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) return setError("Title is required.");
    const base = parseFloat(basePrice);
    if (!base || base <= 0) return setError("Enter a valid base price.");
    const discount = discountPrice ? parseFloat(discountPrice) : null;
    if (discount != null && discount >= base) return setError("Discount price must be less than base price.");
    if (categoryIds.size === 0) return setError("Select at least one category.");

    const payload = {
      title: title.trim(),
      basePrice: base,
      discountPrice: discount,
      stock: parseInt(stock, 10) || 0,
      shortDescription: shortDescription || undefined,
      whoIsItBestFor: whoIsItBestFor || undefined,
      ingredients: ingredients || undefined,
      usageInstructions: usageInstructions || undefined,
      additionInformation: additionInformation || undefined,
      status,
      categoryIds: [...categoryIds],
      concernIds: [...concernIds],
    };

    setSubmitting(true);
    try {
      if (isEdit && initial) {
        await api.patch(`/products/${initial.id}`, payload);
      } else {
        await api.post("/products", {
          ...payload,
          images: images.map(({ imageUrl, isMain, sortOrder }) => ({ imageUrl, isMain, sortOrder })),
        });
      }
      router.push("/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <section className="rounded-2xl border border-border bg-background p-5 space-y-4">
        <Text label="Title" value={title} onChange={setTitle} required />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Text label="Base price (৳)" value={basePrice} onChange={setBasePrice} type="number" required />
          <Text label="Discount price (৳)" value={discountPrice} onChange={setDiscountPrice} type="number" />
          <Text label="Stock" value={stock} onChange={setStock} type="number" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-5">
        <label className="block text-sm font-medium mb-2">Images</label>
        <ImageUploader
          images={images}
          onChange={isEdit ? undefined : setImages}
          productId={isEdit ? initial!.id : undefined}
          onRefresh={refetchImages}
        />
        {isEdit && <p className="mt-2 text-xs text-muted">Image changes are saved immediately.</p>}
      </section>

      <section className="rounded-2xl border border-border bg-background p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <CheckboxGroup
          label="Categories"
          // Tree: each top-level category followed by its indented children.
          // Parent and child are independently selectable (no auto-inherit).
          options={categories.flatMap((c) => [
            { id: c.id, label: c.name, depth: 0 },
            ...(c.children ?? []).map((ch) => ({ id: ch.id, label: ch.name, depth: 1 })),
          ])}
          selected={categoryIds}
          onToggle={(id) => setCategoryIds((s) => toggle(s, id))}
        />
        <CheckboxGroup
          label="Concerns"
          options={concerns.map((c) => ({ id: c.id, label: c.title }))}
          selected={concernIds}
          onToggle={(id) => setConcernIds((s) => toggle(s, id))}
        />
      </section>

      <section className="rounded-2xl border border-border bg-background p-5 space-y-5">
        <Rich label="Short description" value={shortDescription} onChange={setShortDescription} />
        <Rich label="Who is it best for" value={whoIsItBestFor} onChange={setWhoIsItBestFor} />
        <Rich label="Ingredients" value={ingredients} onChange={setIngredients} />
        <Rich label="Usage instructions" value={usageInstructions} onChange={setUsageInstructions} />
        <Rich label="Additional information" value={additionInformation} onChange={setAdditionInformation} />
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Text({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${disabled ? "text-muted" : ""}`}>{label}</label>
      <input
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light transition disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Rich({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <RichTextEditor value={value} onChange={onChange} />
    </div>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string; depth?: number }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {options.map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-2.5 text-sm"
            style={{ paddingLeft: (opt.depth ?? 0) * 20 }}
          >
            <input
              type="checkbox"
              checked={selected.has(opt.id)}
              onChange={() => onToggle(opt.id)}
              className="h-4 w-4 accent-primary"
            />
            {opt.depth ? <span className="text-muted" aria-hidden>└</span> : null}
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
