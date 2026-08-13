import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  organizationId: string | null; // null only for pre-auth routes (register, login)
  userId: string | null;
  roleId: string | null;
  requestId: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Reads the current request's tenant context. Throws if called outside a
 * request (e.g. a background job) — background jobs must build their own
 * context explicitly via `runWithContext`, never inherit one implicitly.
 */
export function getRequestContext(): RequestContext {
  const ctx = requestContextStorage.getStore();
  if (!ctx) {
    throw new Error(
      "getRequestContext() called outside of a request context. " +
        "Background jobs must call runWithContext() explicitly."
    );
  }
  return ctx;
}

/** Same as getRequestContext but returns null instead of throwing — used by the
 * Prisma tenant extension, which must also work for pre-auth queries (e.g.
 * looking up a user by email during login, before organizationId is known). */
export function tryGetRequestContext(): RequestContext | null {
  return requestContextStorage.getStore() ?? null;
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContextStorage.run(ctx, fn);
}
