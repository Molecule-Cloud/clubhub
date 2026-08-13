import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

/**
 * Mirrors apps/admin/lib/api-client.ts's design (in-memory access token,
 * coalesced refresh, same error shape) with one necessary difference:
 * mobile has no browser cookie jar, so the refresh token itself is stored
 * explicitly via expo-secure-store (iOS Keychain / Android Keystore —
 * encrypted at rest) and sent in the request body, not an httpOnly cookie.
 * The backend's /auth/refresh already accepts this (body.refreshToken as
 * a fallback to the cookie), built in Phase 2 before mobile existed.
 */

const API_BASE_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://localhost:4000/api/v1";
const REFRESH_TOKEN_KEY = "clubhub_refresh_token";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export async function storeRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedRefreshToken = await getStoredRefreshToken();
      if (!storedRefreshToken) return null;

      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
        if (!res.ok) {
          // Refresh token is invalid/expired/revoked — clear it so we don't
          // keep retrying a dead token on every subsequent app launch.
          await clearRefreshToken();
          return null;
        }
        const json = await res.json();
        const newAccessToken = json.data?.accessToken ?? null;
        const newRefreshToken = json.data?.refreshToken ?? null;
        // The backend rotates refresh tokens on every use (see
        // backend/src/modules/auth/token.service.ts) — both /auth/login and
        // /auth/refresh return the new refresh token in the response body
        // specifically so native clients (no cookie jar) can store it.
        // Skipping this step would mean resending an already-revoked token
        // on the next refresh, which the backend's theft-detection logic
        // would treat as a compromise signal and revoke the whole session.
        if (newRefreshToken) await storeRefreshToken(newRefreshToken);
        setAccessToken(newAccessToken);
        return newAccessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (!options.skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !options.skipAuth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const errBody = json as ApiErrorBody | null;
    throw new ApiClientError(
      res.status,
      errBody?.error?.code ?? "UNKNOWN_ERROR",
      errBody?.error?.message ?? "Something went wrong. Please try again.",
      errBody?.error?.details
    );
  }

  return json as T;
}

interface Envelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<Envelope<T>>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<Envelope<T>>(path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<Envelope<T>>(path, { ...options, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<Envelope<T>>(path, { ...options, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<Envelope<T>>(path, { ...options, method: "DELETE" }),
  /**
   * For multipart/form-data uploads from an on-device image picker. React
   * Native's FormData accepts a plain {uri, name, type} object for a file
   * field — there's no Blob/File to construct the way a web browser would;
   * this is the RN-native equivalent of the admin app's uploadFile, which
   * takes a real browser File instead.
   */
  uploadFile: <T>(path: string, fieldName: string, file: { uri: string; name: string; type: string }, options?: RequestOptions) => {
    const formData = new FormData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RN's FormData typing wants a Blob; the platform accepts this shape at runtime
    formData.append(fieldName, file as any);
    return request<Envelope<T>>(path, { ...options, method: "POST", body: formData });
  },
};

export { refreshAccessToken };
