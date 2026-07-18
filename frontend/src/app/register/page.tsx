"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { LocationOption } from "@/types";

const BD_PHONE = /^01[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Public location fetch (registration happens while logged out). */
async function fetchLocations(path: string): Promise<LocationOption[]> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: LocationOption[] };
  return json.data ?? [];
}

export default function RegisterPage() {
  const { register, status } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [divisions, setDivisions] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [upazilas, setUpazilas] = useState<LocationOption[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [upazilaId, setUpazilaId] = useState("");
  const [area, setArea] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/account");
  }, [status, router]);

  // The form is long, so on mobile the user submits from near the footer.
  // When the success screen replaces the form, jump back to the top so the
  // "Confirm your email" notice is actually in view.
  useEffect(() => {
    if (registered) window.scrollTo({ top: 0, behavior: "instant" });
  }, [registered]);

  // Load divisions once.
  useEffect(() => {
    fetchLocations("/locations/divisions").then(setDivisions);
  }, []);

  const onDivision = useCallback(async (id: string) => {
    setDivisionId(id);
    setDistrictId("");
    setUpazilaId("");
    setDistricts([]);
    setUpazilas([]);
    if (id) setDistricts(await fetchLocations(`/locations/districts?divisionId=${id}`));
  }, []);

  const onDistrict = useCallback(async (id: string) => {
    setDistrictId(id);
    setUpazilaId("");
    setUpazilas([]);
    if (id) setUpazilas(await fetchLocations(`/locations/upazilas?districtId=${id}`));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!BD_PHONE.test(phone)) return setError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
    if (!EMAIL.test(email.trim())) return setError("Enter a valid Gmail address.");
    if (!divisionId || !districtId || !upazilaId)
      return setError("Please select your division, district and upazila / thana.");
    if (area.trim().length < 3) return setError("Please enter your area.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        phone,
        email: email.trim(),
        password,
        divisionId,
        districtId,
        upazilaId,
        area: area.trim(),
      });
      // Account created but unverified — show the "check your email" screen.
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-light";
  const selectClass =
    "w-full h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed";

  if (registered) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 md:py-16 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16v12H4z" />
            <path d="M4 7l8 6 8-6" />
          </svg>
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Confirm your email</h1>
        <p className="mt-2 text-base text-muted">
          We&apos;ve sent a verification link to{" "}
          <strong className="text-foreground">{email.trim()}</strong>. Click it to activate your
          account — you won&apos;t be able to log in until then. The link expires in 24 hours.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Go to Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-base text-muted">Sign up to track your orders and check out faster.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-base font-medium mb-1.5">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="full name"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-base font-medium mb-1.5">Mobile number</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="01XXXXXXXXX"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-base font-medium mb-1.5">Gmail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            className={inputClass}
          />
        </div>

        {/* Location — four fields in two rows (50 / 50) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-base font-medium mb-1.5">Division</label>
            <select value={divisionId} onChange={(e) => onDivision(e.target.value)} className={selectClass}>
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-base font-medium mb-1.5">District</label>
            <select
              value={districtId}
              onChange={(e) => onDistrict(e.target.value)}
              disabled={!divisionId}
              className={selectClass}
            >
              <option value="">{divisionId ? "Select district" : "Select division first"}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-base font-medium mb-1.5">Upazila / Thana</label>
            <select
              value={upazilaId}
              onChange={(e) => setUpazilaId(e.target.value)}
              disabled={!districtId}
              className={selectClass}
            >
              <option value="">{districtId ? "Select upazila / thana" : "Select district first"}</option>
              {upazilas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-base font-medium mb-1.5">Area</label>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={!divisionId || !districtId || !upazilaId}
              placeholder={divisionId && districtId && upazilaId ? "House / road / area" : "Select location first"}
              className={`${selectClass}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-base font-medium mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-base font-medium mb-1.5">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            className={inputClass}
          />
        </div>
        {error && <p className="rounded-lg bg-primary-light px-3 py-2 text-base text-primary">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-base text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
