"use client";

import { useCallback, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Coupon, CouponType } from "@/lib/types";
import AdminTable, { type Column } from "@/components/ui/AdminTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type ModalState = { mode: "create" } | { mode: "edit"; coupon: Coupon } | null;

const inputClass =
  "w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary";

/** "10% off" / "৳200 off". */
function describeValue(c: Pick<Coupon, "type" | "value">) {
  return c.type === "percent" ? `${Number(c.value)}% off` : `${formatPrice(c.value)} off`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Live status derived from the active flag, date window and usage. */
function couponStatus(c: Coupon): { label: string; className: string } {
  const now = Date.now();
  if (!c.isActive) return { label: "Inactive", className: "bg-surface text-muted" };
  if (c.endsAt && new Date(c.endsAt).getTime() <= now) return { label: "Expired", className: "bg-surface text-muted" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) {
    return { label: "Used up", className: "bg-surface text-muted" };
  }
  if (c.startsAt && new Date(c.startsAt).getTime() > now) {
    return { label: "Scheduled", className: "bg-primary-light text-primary" };
  }
  return { label: "Active", className: "bg-green-100 text-green-700" };
}

export default function CouponsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);

  // Small, non-paginated resource: fetch all and filter by code client-side.
  const fetchPage = useCallback(async ({ q }: { q: string; page: number }) => {
    const res = await api.get<Coupon[]>("/admin/coupons");
    const needle = q.trim().toUpperCase();
    const rows = needle ? res.data.filter((c) => c.code.includes(needle)) : res.data;
    return { rows, hasMore: false, total: rows.length };
  }, []);

  const columns: Column<Coupon>[] = [
    { header: "Code", cell: (c) => <span className="font-mono font-semibold">{c.code}</span> },
    { header: "Discount", cell: (c) => <span>{describeValue(c)}</span> },
    {
      header: "Conditions",
      cell: (c) => (
        <span className="text-muted">{c.minSubtotal ? `Min ${formatPrice(c.minSubtotal)}` : "—"}</span>
      ),
    },
    {
      header: "Valid",
      cell: (c) => (
        <span className="text-muted">
          {c.startsAt || c.endsAt
            ? `${c.startsAt ? formatDate(c.startsAt) : "Now"} – ${c.endsAt ? formatDate(c.endsAt) : "No end"}`
            : "Always"}
        </span>
      ),
    },
    {
      header: "Used",
      cell: (c) => (
        <span className="text-muted">
          {c.usedCount}
          {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (c) => {
        const s = couponStatus(c);
        return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>{s.label}</span>;
      },
    },
  ];

  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Coupons</h1>
          <p className="mt-1 text-sm text-muted">
            Discount codes customers enter at checkout. Coupons apply to the item subtotal only — never the delivery
            fee.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          + Add New
        </button>
      </div>

      <AdminTable
        columns={columns}
        fetchPage={fetchPage}
        getRowKey={(c) => c.id}
        searchPlaceholder="Search coupon codes…"
        itemLabel="coupons"
        reloadKey={reloadKey}
        onEdit={(c) => setModal({ mode: "edit", coupon: c })}
        onDelete={(c) => setToDelete(c)}
      />

      {modal && (
        <CouponModal
          editing={modal.mode === "edit" ? modal.coupon : null}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete coupon"
        message={`Delete coupon "${toDelete?.code}"? Orders that already used it keep their discount.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.del(`/admin/coupons/${toDelete.id}`);
            reload();
          }
        }}
      />
    </div>
  );
}

/** ISO timestamp → value for <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CouponModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Coupon | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [type, setType] = useState<CouponType>(editing?.type ?? "percent");
  const [value, setValue] = useState(editing ? String(Number(editing.value)) : "");
  const [minSubtotal, setMinSubtotal] = useState(editing?.minSubtotal ? String(Number(editing.minSubtotal)) : "");
  const [startsAt, setStartsAt] = useState(toLocalInput(editing?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(editing?.endsAt ?? null));
  const [usageLimit, setUsageLimit] = useState(editing?.usageLimit != null ? String(editing.usageLimit) : "");
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const optionalNumber = (v: string) => (v.trim() === "" ? null : Number(v));

  const save = async () => {
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(trimmed)) {
      return setError("Code must be 3–40 letters, numbers, dashes or underscores.");
    }
    const num = Number(value);
    if (!(num > 0)) return setError("Enter a discount value greater than 0.");
    if (type === "percent" && num > 100) return setError("A percent coupon can't exceed 100%.");
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return setError("End date must be after the start date.");
    }

    setSaving(true);
    try {
      const body = {
        code: trimmed,
        type,
        value: num,
        minSubtotal: optionalNumber(minSubtotal),
        // No max-discount cap is managed from admin; clear any older value so
        // a saved coupon always behaves exactly as the form shows it.
        maxDiscount: null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        usageLimit: usageLimit.trim() === "" ? null : parseInt(usageLimit, 10),
        isActive,
      };
      if (editing) await api.patch(`/admin/coupons/${editing.id}`, body);
      else await api.post("/admin/coupons", body);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        const first = err.fieldErrors ? Object.values(err.fieldErrors)[0]?.[0] : undefined;
        setError(first ?? err.message);
      } else {
        setError("Could not save.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={editing ? "Edit Coupon" : "New Coupon"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={40}
            placeholder="e.g. WELCOME10"
            className={`${inputClass} font-mono uppercase`}
          />
          <p className="mt-1 text-xs text-muted">Customers can type it in any case.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as CouponType)} className={inputClass}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (৳)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{type === "percent" ? "Percent off" : "Amount off (৳)"}</label>
            <input
              type="number"
              min={0}
              max={type === "percent" ? 100 : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Min. subtotal (৳) <span className="font-normal text-muted">optional</span>
          </label>
          <input
            type="number"
            min={0}
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
            className={`${inputClass} max-w-40`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Starts <span className="font-normal text-muted">optional</span>
            </label>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Ends <span className="font-normal text-muted">optional</span>
            </label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Usage limit <span className="font-normal text-muted">optional — total uses across all customers</span>
          </label>
          <input
            type="number"
            min={1}
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Unlimited"
            className={`${inputClass} max-w-40`}
          />
          {editing && <p className="mt-1 text-xs text-muted">Used {editing.usedCount} time(s) so far.</p>}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-primary" />
          Active
        </label>

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
