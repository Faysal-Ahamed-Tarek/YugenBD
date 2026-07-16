"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  authApi,
  ApiError,
  setAccessToken,
  setRefreshHandler,
  setOnUnauthorized,
} from "./authClient";
import type { AuthUser } from "@/types";

type Status = "loading" | "authenticated" | "unauthenticated";

export interface RegisterInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  area: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: Status;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // Restore the session from the httpOnly refresh cookie; returns the new
  // access token (or null when there's no valid session).
  const doRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await authApi.post<{ user: AuthUser; accessToken: string }>("/auth/refresh");
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

  useEffect(() => {
    setRefreshHandler(doRefresh);
    setOnUnauthorized(() => {
      setUser(null);
      setAccessToken(null);
      setStatus("unauthenticated");
    });
    doRefresh(); // silent refresh on load
    return () => setRefreshHandler(null);
  }, [doRefresh]);

  const applySession = (u: AuthUser, token: string) => {
    setUser(u);
    setAccessToken(token);
    setStatus("authenticated");
  };

  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const res = await authApi.post<{ user: AuthUser; accessToken: string }>("/auth/customer-login", {
        identifier,
        password,
      });
      applySession(res.data.user, res.data.accessToken);
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "Login failed");
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    try {
      const res = await authApi.post<{ user: AuthUser; accessToken: string }>("/auth/register", input);
      applySession(res.data.user, res.data.accessToken);
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "Registration failed");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
