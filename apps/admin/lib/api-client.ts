/**
 * Access token lives in memory only (module-level variable), never in
 * localStorage — this mirrors the backend's own security posture (httpOnly
 * refresh cookie, short-lived access token) and avoids XSS-exfiltrable
 * token storage. The refresh token itself is an httpOnly cookie the browser
 * sends automatically; this client never touches it directly.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
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
  // Coalesce concurrent refresh attempts (e.g. three failed requests firing
  // at once) into a single network call rather than racing three refreshes,
  // which would revoke each other's tokens under the rotation scheme.
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the httpOnly refresh cookie
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = await res.json();
        const token = json.data?.accessToken ?? null;
        setAccessToken(token);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Core request function. On a 401 (and only once, to avoid infinite loops),
 * attempts a silent refresh and retries the original request with the new
 * token before giving up.
 */
async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (!options.skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

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
   * For multipart/form-data uploads (e.g. an organization logo). Deliberately
   * bypasses the JSON.stringify path — and crucially does NOT set a
   * Content-Type header, since the browser must set it itself with the
   * correct multipart boundary string, which JS code cannot construct.
   */
  uploadFile: <T>(path: string, fieldName: string, file: File, options?: RequestOptions) => {
    const formData = new FormData();
    formData.append(fieldName, file);
    return request<Envelope<T>>(path, { ...options, method: "POST", body: formData });
  },
};

export { refreshAccessToken };
