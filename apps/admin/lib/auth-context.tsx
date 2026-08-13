"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, setAccessToken, refreshAccessToken, ApiClientError } from "./api-client";

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  isLoading: boolean;
  login: (email: string, password: string, organizationSlug: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount, attempt a silent refresh using the httpOnly cookie — this is
  // what keeps someone logged in across a page reload without ever storing
  // the access token anywhere persistent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get<{ user: AuthUser; organization: AuthOrganization }>("/auth/me");
        if (cancelled) return;
        setUser(res.data.user);
        setOrganization(res.data.organization);
      } catch {
        // Token refreshed but /auth/me failed for some other reason — still
        // treat as logged out rather than showing a broken authenticated
        // shell with no identity.
        setAccessToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, organizationSlug: string) => {
      const res = await api.post<{
        accessToken: string;
        user: AuthUser;
        organization: AuthOrganization;
      }>("/auth/login", { email, password, organizationSlug }, { skipAuth: true });

      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      setOrganization(res.data.organization);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Best-effort — even if the server call fails, clear local state so
      // the UI doesn't strand the person in a half-logged-in view.
    }
    setAccessToken(null);
    setUser(null);
    setOrganization(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, organization, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiClientError };
