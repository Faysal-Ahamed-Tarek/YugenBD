"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authApi, ApiError } from "@/lib/authClient";
import PasswordInput from "@/components/ui/PasswordInput";

export default function ResetPasswordPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-muted">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const complete = newPassword.length >= 8 && newPassword === confirmPassword;

  const inputClass =
    "w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-light";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await authApi.post("/auth/reset-password", { token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // No token in the URL — the link is broken or was typed by hand.
  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 md:py-16 text-center">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-3 text-base text-muted">
          This reset link is invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 md:py-16 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l5 5L20 6.5" />
          </svg>
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Password reset</h1>
        <p className="mt-2 text-base text-muted">
          Your password has been changed. Log in with your new password.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <p className="mt-1 text-base text-muted">Choose a new password for your account.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="newPassword" className="block text-base font-medium mb-1.5">
            New password
          </label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-base font-medium mb-1.5">
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
          {mismatch && <p className="mt-1 text-sm text-primary">Passwords do not match.</p>}
        </div>
        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-base text-primary">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !complete}
          className="w-full h-11 rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {submitting ? "Resetting…" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
