"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Category, Concern, Product } from "@/lib/types";
import ImageUploader, { type EditableImage } from "@/components/ui/ImageUploader";
import RichTextEditor from "@/components/ui/RichTextEditor";

type WeightUnit = "ml" | "g" | "l" | "kg" | "pcs";
const WEIGHT_UNITS: WeightUnit[] = ["ml", "g", "l", "kg", "pcs"];

interface WeightRow {
  value: string;
  unit: WeightUnit;
  stock: string;
  price: string;
  isDefault: boolean;
}

interface DetailProduct extends Product {
  concerns?: { id: string; title: string; slug: string }[];
  weights?: {
    id: string;
    value: string;
    unit: WeightUnit;
    stock: number;
    price: string | null;
    isDefault: boolean;
    sortOrder: number;
  }[];
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
  const [weights, setWeights] = useState<WeightRow[]>(
    (initial?.weights ?? []).map((w) => ({
      value: w.value,
      unit: w.unit,
      stock: String(w.stock ?? 0),
      price: w.price ?? "",
      isDefault: w.isDefault,
    }))
  );
  // When weights exist, stock is tracked per-weight — the base stock is ignored.
  const hasWeights = weights.length > 0;

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/categories").then((r) => setCategories(r.data));
    api.get<Concern[]>("/concerns").then((r) => setConcerns(r.data));
  }, []);

  const addWeight = () =>
    setWeights((w) => [...w, { value: "", unit: "ml", stock: "0", price: "", isDefault: w.length === 0 }]);
  const removeWeight = (index: number) =>
    setWeights((w) => w.filter((_, i) => i !== index));
  const updateWeight = (index: number, patch: Partial<WeightRow>) =>
    setWeights((w) => w.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const setDefaultWeight = (index: number) =>
    setWeights((w) => w.map((row, i) => ({ ...row, isDefault: i === index })));

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

    // Validate weight rows (if any): each is a sellable variant needing a
    // positive amount and price, plus a non-negative stock.
    const cleanWeights = weights
      .filter((w) => w.value.trim() !== "")
      .map((w) => ({
        value: parseFloat(w.value),
        unit: w.unit,
        stock: parseInt(w.stock, 10) || 0,
        price: w.price.trim() !== "" ? parseFloat(w.price) : null,
        isDefault: w.isDefault,
      }));
    if (cleanWeights.some((w) => !w.value || w.value <= 0)) {
      return setError("Each weight needs a positive amount.");
    }
    if (cleanWeights.some((w) => w.price == null || w.price <= 0)) {
      return setError("Each weight needs a positive price.");
    }
    if (cleanWeights.some((w) => w.stock < 0)) {
      return setError("Weight stock can't be negative.");
    }
    // Ensure exactly one default when weights exist.
    if (cleanWeights.length > 0 && !cleanWeights.some((w) => w.isDefault)) {
      cleanWeights[0].isDefault = true;
    }

    const payload = {
      title: title.trim(),
      basePrice: base,
      discountPrice: discount,
      // Base stock is ignored when per-weight variants exist.
      stock: cleanWeights.length > 0 ? 0 : parseInt(stock, 10) || 0,
      shortDescription: shortDescription || undefined,
      whoIsItBestFor: whoIsItBestFor || undefined,
      ingredients: ingredients || undefined,
      usageInstructions: usageInstructions || undefined,
      additionInformation: additionInformation || undefined,
      status,
      categoryIds: [...categoryIds],
      concernIds: [...concernIds],
      weights: cleanWeights,
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
          <Text
            label="Stock"
            value={hasWeights ? "" : stock}
            onChange={setStock}
            type="number"
            disabled={hasWeights}
            hint={hasWeights ? "Tracked per weight below" : undefined}
          />
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

      {/* Weight variants (optional) — each is a sellable variant with its own
          stock + price. When present, the product-level stock is ignored. */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium">Weights (optional)</label>
          <button
            type="button"
            onClick={addWeight}
            className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
          >
            + Add weight
          </button>
        </div>
        {weights.length === 0 ? (
          <p className="text-xs text-muted">
            No weight variants. Add rows (e.g. 50 ml, 100 ml) if this product is sold in
            multiple sizes — each row carries its own stock and price, and customers must
            pick one before ordering.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_5rem_5rem_6rem_auto_auto] gap-2 text-xs font-medium text-muted">
              <span>Amount</span>
              <span>Unit</span>
              <span>Stock</span>
              <span>Price (৳)</span>
              <span>Default</span>
              <span></span>
            </div>
            {weights.map((w, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_5rem_5rem_6rem_auto_auto] items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={w.value}
                  onChange={(e) => updateWeight(i, { value: e.target.value })}
                  placeholder="Amount"
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
                />
                <select
                  value={w.unit}
                  onChange={(e) => updateWeight(i, { unit: e.target.value as WeightUnit })}
                  className="h-9 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
                >
                  {WEIGHT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={w.stock}
                  onChange={(e) => updateWeight(i, { stock: e.target.value })}
                  placeholder="Stock"
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
                />
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={w.price}
                  onChange={(e) => updateWeight(i, { price: e.target.value })}
                  placeholder="Price"
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="radio"
                    name="default-weight"
                    checked={w.isDefault}
                    onChange={() => setDefaultWeight(i)}
                    className="accent-primary"
                  />
                  <span className="sm:hidden">Default</span>
                </label>
                <button type="button" onClick={() => removeWeight(i)} className="justify-self-end text-muted hover:text-red-600" aria-label="Remove weight">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
