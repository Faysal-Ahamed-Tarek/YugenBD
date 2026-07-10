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

export const REFRESH_COOKIE = "yugenbd_refresh";

/** Cookie options for the refresh token — httpOnly, lax, path-scoped to auth. */
export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
