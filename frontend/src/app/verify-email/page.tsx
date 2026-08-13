"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authApi, ApiError } from "@/lib/authClient";

export default function VerifyEmailPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-muted">Loading…</div>}>
      <VerifyEmail />
    </Suspense>
  );
}

type State = "verifying" | "done" | "error";

function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>(token ? "verifying" : "error");
  const [message, setMessage] = useState("This verification link is invalid. Please request a new one.");
  // React 18 dev StrictMode double-mounts effects — guard so we verify once.
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi
      .post("/auth/verify-email", { token })
      .then(() => setState("done"))
      .catch((err) => {
        setMessage(
          err instanceof ApiError ? err.message : "Something went wrong. Please try again."
        );
        setState("error");
      });
  }, [token]);

  if (state === "verifying") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Verifying your email…</h1>
        <p className="mt-2 text-base text-muted">Hang tight, this only takes a moment.</p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 md:py-16 text-center">
        <h1 className="text-2xl font-semibold">Email verified</h1>
        <p className="mt-2 text-base text-muted">
          Your account is active. Log in to start shopping.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16 text-center">
      <h1 className="text-2xl font-semibold">Verification failed</h1>
      <p className="mt-2 text-base text-muted">{message}</p>
      <Link
        href="/login"
        className="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
      >
        Go to Log in
      </Link>
    </div>
  );
}
