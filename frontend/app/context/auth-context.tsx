"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  [key: string]: unknown;
};

type LoginCredentials = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractUser(payload: unknown): AuthUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as { user?: unknown; data?: unknown } & Record<string, unknown>;

  if (candidate.user && typeof candidate.user === "object") {
    return candidate.user as AuthUser;
  }

  if (candidate.data && typeof candidate.data === "object") {
    const nested = candidate.data as { user?: unknown } & Record<string, unknown>;

    if (nested.user && typeof nested.user === "object") {
      return nested.user as AuthUser;
    }

    return nested as AuthUser;
  }

  return payload as AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const response = await apiFetch("/api/auth/me");

    if (!response.ok) {
      setUser(null);
      return null;
    }

    const payload = await readResponseBody(response);
    const nextUser = extractUser(payload);

    setUser(nextUser);
    return nextUser;
  };

  const login = async ({ email, password }: LoginCredentials) => {
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = await readResponseBody(response);
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "Login failed")
          : "Login failed";

      throw new Error(message);
    }

    const payload = await readResponseBody(response);
    const nextUser = extractUser(payload) ?? (await refreshUser());

    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await apiFetch("/api/auth/logout", {
      method: "POST",
    }).catch(() => undefined);

    setUser(null);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}