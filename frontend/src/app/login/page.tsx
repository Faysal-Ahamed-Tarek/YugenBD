"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const BD_PHONE = /^01[3-9]\d{8}$/;

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/account");
  }, [status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!BD_PHONE.test(phone)) return setError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
    if (!password) return setError("Password is required.");
    setSubmitting(true);
    try {
      await login(phone, password);
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-muted">Welcome back — sign in with your mobile number.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Mobile number</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="01XXXXXXXXX"
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
          />
        </div>
        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
