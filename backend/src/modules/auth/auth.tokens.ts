import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import type { AuthPayload } from "../../middleware/auth";

export interface RefreshPayload {
  userId: string;
  tokenVersion: number;
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
}

/* ───────────── Password-reset tokens (emailed links) ─────────────
 * Signed with the secret PLUS the user's current password hash, so a link
 * is single-use by construction: resetting the password changes the hash
 * and invalidates every previously issued link — no DB table needed.
 * Verification is two-step: decode (unverified) to learn the userId, load
 * the user, then verify against that user's hash. */

export interface PasswordResetPayload {
  userId: string;
  purpose: "password_reset";
}

const resetSecret = (passwordHash: string) => `${env.JWT_ACCESS_SECRET}.${passwordHash}`;

export function signPasswordResetToken(userId: string, passwordHash: string): string {
  const payload: PasswordResetPayload = { userId, purpose: "password_reset" };
  return jwt.sign(payload, resetSecret(passwordHash), { expiresIn: "30m" });
}

/** Unverified decode — only to find which user's hash to verify against. */
export function decodePasswordResetToken(token: string): PasswordResetPayload | null {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object") return null;
  const payload = decoded as Partial<PasswordResetPayload>;
  return payload.purpose === "password_reset" && typeof payload.userId === "string"
    ? (payload as PasswordResetPayload)
    : null;
}

export function verifyPasswordResetToken(token: string, passwordHash: string): PasswordResetPayload {
  return jwt.verify(token, resetSecret(passwordHash)) as PasswordResetPayload;
}

/* ───────────── Email-verification tokens (emailed links) ─────────────
 * Plain signed JWT — verifying twice is harmless (idempotent flip to true),
 * so single-use construction isn't needed here. */

export interface EmailVerifyPayload {
  userId: string;
  purpose: "email_verify";
}

export function signEmailVerifyToken(userId: string): string {
  const payload: EmailVerifyPayload = { userId, purpose: "email_verify" };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "24h" });
}

export function verifyEmailVerifyToken(token: string): EmailVerifyPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as Partial<EmailVerifyPayload>;
  if (payload.purpose !== "email_verify" || typeof payload.userId !== "string") {
    throw new Error("Wrong token purpose");
  }
  return payload as EmailVerifyPayload;
}

export const REFRESH_COOKIE = "yugenbd_refresh";

/** Cookie options for the refresh token — httpOnly, lax, path-scoped to auth. */
export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
