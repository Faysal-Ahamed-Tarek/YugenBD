import type { ApiEnvelope } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Error carrying the backend message + optional Zod field errors. */
export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Wired by the AuthProvider so the client can attach the access token,
// silently refresh on 401, and react when the session is truly gone.
let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let onUnauthorized: () => void = () => {};

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function setRefreshHandler(fn: (() => Promise<string | null>) | null) {
  refreshHandler = fn;
}
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

interface RequestOptions {
  method?: string;
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
  auth?: boolean; // attach access token (default true)
}

async function request<T>(path: string, opts: RequestOptions = {}, allowRetry = true): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { ...opts.headers };
  const auth = opts.auth ?? true;
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let body = opts.body;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
    credentials: "include",
  });

  if (res.status === 401 && auth && allowRetry && refreshHandler) {
    const newToken = await refreshHandler();
    if (newToken) {
      accessToken = newToken;
      return request<T>(path, opts, false);
    }
    onUnauthorized();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new ApiError(json?.message ?? "Request failed", res.status, json?.errors);
  }
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path).then((r) => r),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json?: unknown) => request<T>(path, { method: "PATCH", json }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Multipart upload (images) — returns Cloudinary URLs from the uploads module. */
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

export { API_URL };
