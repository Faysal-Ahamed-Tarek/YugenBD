"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { FaqItem, FaqSegment } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// The four fixed Help Centre segments and their storefront titles.
const SEGMENTS: { key: FaqSegment; num: string; title: string }[] = [
  { key: "products", num: "01", title: "Products & Authenticity" },
  { key: "orders", num: "02", title: "Orders & Payment" },
  { key: "delivery", num: "03", title: "Delivery" },
  { key: "returns", num: "04", title: "Returns & Care" },
];

export default function FaqAdminPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [creatingIn, setCreatingIn] = useState<FaqSegment | null>(null);
  const [toDelete, setToDelete] = useState<FaqItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<FaqItem[]>("/faq/all");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (item: FaqItem) => {
    await api.patch(`/faq/${item.id}`, { isActive: !item.isActive });
    load();
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">FAQ</h1>
        <p className="mt-1 text-sm text-muted">
          Manage the storefront Help Centre questions across the four segments. Only active questions
          appear on the site.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        SEGMENTS.map((seg) => {
          const segItems = items.filter((i) => i.segment === seg.key);
          return (
            <section key={seg.key} className="rounded-2xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-sm italic text-primary">{seg.num}</span>
                  <h2 className="text-lg font-semibold">{seg.title}</h2>
                  <span className="text-xs text-muted">({segItems.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatingIn(seg.key)}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                >
                  + Add Question
                </button>
              </div>

              {segItems.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                  No questions in this segment yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {segItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.question}</p>
                        <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-muted">
                          {item.answer}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleActive(item)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.isActive ? "bg-green-100 text-green-700" : "bg-surface text-muted"
                          }`}
                        >
                          {item.isActive ? "Active" : "Hidden"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-primary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(item)}
                          className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-red-600"
                          aria-label="Delete question"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      {(creatingIn || editing) && (
        <FaqModal
          item={editing}
          segment={editing ? editing.segment : creatingIn!}
          onClose={() => {
            setEditing(null);
            setCreatingIn(null);
          }}
          onSaved={() => {
            setEditing(null);
            setCreatingIn(null);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete question"
        message={`Delete "${toDelete?.question}"?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/faq/${toDelete.id}`);
            load();
          }
        }}
      />
    </div>
  );
}

function FaqModal({
  item,
  segment,
  onClose,
  onSaved,
}: {
  item: FaqItem | null;
  segment: FaqSegment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [seg, setSeg] = useState<FaqSegment>(segment);
  const [question, setQuestion] = useState(item?.question ?? "");
  const [answer, setAnswer] = useState(item?.answer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    if (question.trim().length < 3) return setError("Question is too short.");
    if (answer.trim().length < 3) return setError("Answer is too short.");
    setSaving(true);
    try {
      const payload = { segment: seg, question: question.trim(), answer: answer.trim() };
      if (item) {
        await api.patch(`/faq/${item.id}`, payload);
      } else {
        await api.post("/faq", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={item ? "Edit Question" : "Add Question"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Segment</label>
          <select
            value={seg}
            onChange={(e) => setSeg(e.target.value as FaqSegment)}
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          >
            {SEGMENTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Question</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Are your products 100% authentic?"
            className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={6}
            placeholder="Write the answer. Leave a blank line to start a new paragraph."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted">Plain text. A blank line starts a new paragraph.</p>
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
