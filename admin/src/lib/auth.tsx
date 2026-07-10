"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  api,
  ApiError,
  setAccessToken,
  setRefreshHandler,
  setOnUnauthorized,
} from "./api";
import type { AdminUser } from "./types";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AdminUser | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // Refresh using the httpOnly cookie; returns the new access token (or null).
  const doRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await api.post<{ user: AdminUser; accessToken: string }>("/auth/refresh");
      setUser(res.data.user);
      setAccessToken(res.data.accessToken);
      setStatus("authenticated");
      return res.data.accessToken;
    } catch {
      setUser(null);
      setAccessToken(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  // Wire the api client to this provider once.
  useEffect(() => {
    setRefreshHandler(doRefresh);
    setOnUnauthorized(() => {
      setUser(null);
      setAccessToken(null);
      setStatus("unauthenticated");
    });
    // Silent refresh on app load.
    doRefresh();
    return () => {
      setRefreshHandler(null);
    };
  }, [doRefresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ user: AdminUser; accessToken: string }>("/auth/login", {
        email,
        password,
      });
      setUser(res.data.user);
      setAccessToken(res.data.accessToken);
      setStatus("authenticated");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
