"use client";

// Browser-side API client for customer auth. Keeps the access token in memory,
// silently refreshes on 401 via the httpOnly refresh cookie, and reacts when
// the session is truly gone. Auth endpoints never trigger the refresh-retry
// (a 401 there is terminal — wrong credentials or no session).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

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
  auth?: boolean; // attach access token (default true)
}

async function request<T>(path: string, opts: RequestOptions = {}, allowRetry = true): Promise<Envelope<T>> {
  const headers: Record<string, string> = {};
  const auth = opts.auth ?? true;
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let body: string | undefined;
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

  const isAuthEndpoint = path.startsWith("/auth/");
  if (res.status === 401 && auth && allowRetry && refreshHandler && !isAuthEndpoint) {
    const newToken = await refreshHandler();
    if (newToken) {
      accessToken = newToken;
      return request<T>(path, opts, false);
    }
    onUnauthorized();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new ApiError(json?.message ?? "Request failed", res.status, json?.errors);
  }
  return json;
}

export const authApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: "POST", json }),
  put: <T>(path: string, json?: unknown) => request<T>(path, { method: "PUT", json }),
};
