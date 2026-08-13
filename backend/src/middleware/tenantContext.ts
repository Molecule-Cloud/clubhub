import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { runWithContext } from "../lib/requestContext";
import { ApiError } from "../utils/ApiError";

/**
 * Must run AFTER authGuard. Reads the verified token payload (req.auth) and
 * establishes the AsyncLocalStorage context that lib/prisma.ts reads to
 * auto-scope every tenant query for the remainder of this request.
 *
 * Everything downstream of `next()` — controllers, services, the Prisma
 * extension — runs inside `runWithContext`, so `getRequestContext()` works
 * anywhere in that call chain without the organizationId being passed
 * explicitly through every function signature.
 */
export function tenantContextMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return next(ApiError.unauthorized("tenantContextMiddleware requires authGuard to run first"));
  }

  runWithContext(
    {
      organizationId: req.auth.organizationId,
      userId: req.auth.userId,
      roleId: req.auth.roleId,
      requestId: String(res.getHeader("x-request-id") ?? randomUUID()),
    },
    () => next()
  );
}
