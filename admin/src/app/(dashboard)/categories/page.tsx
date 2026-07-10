"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SingleImageUpload from "@/components/ui/SingleImageUpload";

const PLACEHOLDER = "/placeholder.svg";

export default function CategoriesPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const fetchPage = useCallback(async ({ q }: { q: string; page: number }) => {
    const res = await api.get<Category[]>(`/categories${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    return { rows: res.data, hasMore: false };
  }, []);

  const columns: Column<Category>[] = [
    {
      header: "Category",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
            <Image src={c.imageUrl ?? PLACEHOLDER} alt="" fill sizes="40px" className="object-cover" />
          </span>
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    { header: "Slug", cell: (c) => <span className="text-muted">{c.slug}</span> },
  ];

  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          + Add New
        </button>
      </div>

      <AdminTable
        columns={columns}
        fetchPage={fetchPage}
        getRowKey={(c) => c.id}
        searchPlaceholder="Search categories…"
        reloadKey={reloadKey}
        onEdit={(c) => setEditing(c)}
        onDelete={(c) => setToDelete(c)}
      />

      {(creating || editing) && (
        <CategoryModal
          category={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete category"
        message={`Delete "${toDelete?.name}"?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/categories/${toDelete.id}`);
            reload();
          }
        }}
      />
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(category?.imageUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    if (name.trim().length < 2) return setError("Name is required.");
    setSaving(true);
    try {
      const body = { name: name.trim(), imageUrl };
      if (category) await api.patch(`/categories/${category.id}`, body);
      else await api.post("/categories", body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={category ? "Edit Category" : "New Category"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Image</label>
          <SingleImageUpload value={imageUrl} onChange={setImageUrl} folder="products" />
        </div>
        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface">
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
