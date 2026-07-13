"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// A flattened tree row: depth 0 = top-level, depth 1 = subcategory. The list is
// ordered parent-then-its-children so the table reads as an indented tree.
type CatRow = Category & { depth: 0 | 1 };

/** State for the create/edit modal. `parentId` presets the parent dropdown. */
type ModalState =
  | { mode: "create"; parentId: string | null }
  | { mode: "edit"; category: Category }
  | null;

export default function CategoriesPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const [toDelete, setToDelete] = useState<CatRow | null>(null);

  const fetchPage = useCallback(async ({ q }: { q: string; page: number }) => {
    // Searching flattens across the whole table (no tree); otherwise show the
    // nested tree flattened into parent-then-children rows.
    if (q) {
      const res = await api.get<Category[]>(`/categories?flat=true&q=${encodeURIComponent(q)}`);
      return { rows: res.data.map((c) => ({ ...c, depth: 0 as const })), hasMore: false };
    }
    const res = await api.get<Category[]>("/categories");
    const rows: CatRow[] = [];
    for (const parent of res.data) {
      rows.push({ ...parent, depth: 0 });
      for (const child of parent.children ?? []) rows.push({ ...child, depth: 1 });
    }
    return { rows, hasMore: false };
  }, []);

  const columns: Column<CatRow>[] = [
    {
      header: "Category",
      cell: (c) => (
        <div className="flex items-center gap-3" style={{ paddingLeft: c.depth * 28 }}>
          {c.depth === 1 && <span className="text-muted" aria-hidden>└</span>}
          <span className="font-medium">{c.name}</span>
          {c.depth === 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModal({ mode: "create", parentId: c.id });
              }}
              className="ml-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted hover:border-primary hover:text-primary"
            >
              + Subcategory
            </button>
          )}
        </div>
      ),
    },
    { header: "Slug", cell: (c) => <span className="text-muted">{c.slug}</span> },
    {
      header: "Type",
      cell: (c) => (
        <span className="text-muted">{c.depth === 0 ? "Top-level" : "Subcategory"}</span>
      ),
    },
  ];

  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <button
          type="button"
          onClick={() => setModal({ mode: "create", parentId: null })}
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
        onEdit={(c) => setModal({ mode: "edit", category: c })}
        onDelete={(c) => setToDelete(c)}
      />

      {modal && (
        <CategoryModal
          state={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete category"
        message={
          toDelete?.depth === 0
            ? `Delete "${toDelete?.name}"? Categories with subcategories or products can't be deleted.`
            : `Delete "${toDelete?.name}"?`
        }
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
  state,
  onClose,
  onSaved,
}: {
  state: Exclude<ModalState, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = state.mode === "edit" ? state.category : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(
    state.mode === "create" ? state.parentId : (editing?.parentId ?? null)
  );
  const [topLevel, setTopLevel] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Parent options = existing top-level categories, excluding the one being
  // edited (a category can't be its own parent).
  useEffect(() => {
    api.get<Category[]>("/categories").then((r) => {
      setTopLevel(r.data.filter((c) => c.id !== editing?.id));
    });
  }, [editing?.id]);

  const save = async () => {
    setError(null);
    if (name.trim().length < 2) return setError("Name is required.");
    setSaving(true);
    try {
      const body = { name: name.trim(), parentId };
      if (editing) await api.patch(`/categories/${editing.id}`, body);
      else await api.post("/categories", body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={editing ? "Edit Category" : "New Category"} onClose={onClose}>
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
          <label className="block text-sm font-medium mb-1.5">Parent Category</label>
          <select
            value={parentId ?? ""}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">None — top-level category</option>
            {topLevel.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Choose a parent to make this a subcategory (one level deep only).
          </p>
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
