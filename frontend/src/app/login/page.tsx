"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/authClient";

const BD_PHONE = /^01[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Offered when login is blocked by the email-verification check.
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/account");
  }, [status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResent(false);
    const id = identifier.trim();
    if (!BD_PHONE.test(id) && !EMAIL.test(id)) {
      return setError("Enter your mobile number (01XXXXXXXXX) or email.");
    }
    if (!password) return setError("Password is required.");
    setSubmitting(true);
    try {
      await login(id, password);
      router.push("/account");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      if (message.toLowerCase().includes("verify your email")) setNeedsVerification(true);
    } finally {
      setSubmitting(false);
    }
  };

  const resendVerification = async () => {
    setResent(false);
    try {
      await authApi.post("/auth/resend-verification", { identifier: identifier.trim() });
      setResent(true);
    } catch {
      /* generic endpoint — a failure here just leaves the button available */
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-base text-muted">Welcome back — sign in with your mobile number or email.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-base font-medium mb-1.5">Mobile number or email</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="01XXXXXXXXX or you@email.com"
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-base font-medium">Password</label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
          />
        </div>
        {error && (
          <div className="rounded-lg bg-primary-light px-3 py-2 text-base text-primary">
            <p>{error}</p>
            {needsVerification &&
              (resent ? (
                <p className="mt-1.5 text-sm">
                  A new verification link has been sent. Check your inbox.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={resendVerification}
                  className="mt-1.5 text-sm font-semibold underline hover:no-underline"
                >
                  Resend verification email
                </button>
              ))}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-base text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
