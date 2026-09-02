import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { router } from "expo-router";
import { api, setAccessToken, refreshAccessToken, storeRefreshToken, clearRefreshToken, ApiClientError } from "./api-client";

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  isLoading: boolean;
  login: (email: string, password: string, organizationSlug: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetches /auth/me and updates context state — called after profile
   * or avatar edits so the change is reflected immediately everywhere
   * `useAuth()` is read, not just on the next app launch. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app launch, attempt a silent refresh using the token stored in
  // SecureStore (Keychain/Keystore) — the mobile equivalent of the admin
  // app's httpOnly-cookie-based session restore.
  useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (!token) return;

      const res = await api.get<{ user: AuthUser; organization: AuthOrganization }>("/auth/me");
      if (cancelled) return;
      setUser(res.data.user);
      setOrganization(res.data.organization);
    } catch {
      setAccessToken(null);
      await clearRefreshToken();
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  })();
  return () => {
    cancelled = true;
  };
}, []);

  const login = useCallback(async (email: string, password: string, organizationSlug: string) => {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
      organization: AuthOrganization;
    }>("/auth/login", { email, password, organizationSlug }, { skipAuth: true });

    setAccessToken(res.data.accessToken);
    await storeRefreshToken(res.data.refreshToken);
    setUser(res.data.user);
    setOrganization(res.data.organization);
    router.replace("/(tabs)/card");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Best-effort — clear local state regardless of whether the server
      // call succeeds, so the app doesn't strand the person mid-session.
    }
    setAccessToken(null);
    await clearRefreshToken();
    setUser(null);
    setOrganization(null);
    router.replace("/login");
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ user: AuthUser; organization: AuthOrganization }>("/auth/me");
    setUser(res.data.user);
    setOrganization(res.data.organization);
  }, []);

  return (
    <AuthContext.Provider value={{ user, organization, isLoading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiClientError };
