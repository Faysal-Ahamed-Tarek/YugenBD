"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/authClient";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL.test(email.trim())) return setError("Enter a valid Gmail address.");
    setSubmitting(true);
    try {
      await authApi.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <p className="mt-1 text-base text-muted">
        Enter the Gmail on your account and we&apos;ll send you a link to reset your password.
      </p>

      {sent ? (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16v12H4z" />
              <path d="M4 7l8 6 8-6" />
            </svg>
          </span>
          <p className="mt-4 text-base font-semibold">Check your email</p>
          <p className="mt-1 text-base text-muted">
            If an account exists for <strong className="text-foreground">{email.trim()}</strong>, a
            password-reset link is on its way. The link expires in 30 minutes.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            Back to Log in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-base font-medium mb-1.5">
              Gmail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
            />
          </div>
          {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-base text-primary">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-base text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
