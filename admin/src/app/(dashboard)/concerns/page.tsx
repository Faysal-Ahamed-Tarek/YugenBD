"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Concern } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SingleImageUpload from "@/components/ui/SingleImageUpload";

const PLACEHOLDER = "/placeholder.svg";

export default function ConcernsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Concern | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Concern | null>(null);

  const fetchPage = useCallback(async ({ q }: { q: string; page: number }) => {
    const res = await api.get<Concern[]>(`/concerns${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    return { rows: res.data, hasMore: false };
  }, []);

  const columns: Column<Concern>[] = [
    {
      header: "Concern",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
            <Image src={c.imageUrl || PLACEHOLDER} alt="" fill sizes="40px" className="object-cover" />
          </span>
          <span className="font-medium">{c.title}</span>
        </div>
      ),
    },
    { header: "Slug", cell: (c) => <span className="text-muted">{c.slug}</span> },
    { header: "Order", cell: (c) => <span className="text-muted">{c.sortOrder}</span> },
  ];

  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Concerns</h1>
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
        searchPlaceholder="Search concerns…"
        reloadKey={reloadKey}
        onEdit={(c) => setEditing(c)}
        onDelete={(c) => setToDelete(c)}
      />

      {(creating || editing) && (
        <ConcernModal
          concern={editing}
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
        title="Delete concern"
        message={`Delete "${toDelete?.title}"?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/concerns/${toDelete.id}`);
            reload();
          }
        }}
      />
    </div>
  );
}

function ConcernModal({
  concern,
  onClose,
  onSaved,
}: {
  concern: Concern | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(concern?.title ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(concern?.imageUrl ?? null);
  const [sortOrder, setSortOrder] = useState(String(concern?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    if (title.trim().length < 2) return setError("Title is required.");
    if (!imageUrl) return setError("An image is required for a concern.");
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        imageUrl,
        sortOrder: parseInt(sortOrder, 10) || 0,
      };
      if (concern) await api.patch(`/concerns/${concern.id}`, body);
      else await api.post("/concerns", body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={concern ? "Edit Concern" : "New Concern"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-24 h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            />
          </div>
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
