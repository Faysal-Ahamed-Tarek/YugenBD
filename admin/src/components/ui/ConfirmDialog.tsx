"use client";

import { useState } from "react";
import Modal from "./Modal";

/** Reusable delete/confirm dialog. Shows an async loading + error state. */
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-muted">{message}</p>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={loading}
          className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
