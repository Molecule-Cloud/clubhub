import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../modules/auth/token.service";
import { ApiError } from "../utils/ApiError";

/**
 * Verifies the Bearer access token and attaches the decoded payload to
 * req.auth. Does NOT set up the tenant/RLS context by itself — that's
 * tenantContextMiddleware, which must run immediately after this one.
 * They're kept separate so routes that need auth but not a specific tenant
 * (e.g. "list my organizations") can use authGuard alone.
 */
export function authGuard(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);
  req.auth = verifyAccessToken(token);
  next();
}
