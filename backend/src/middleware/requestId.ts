import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

/**
 * Attaches a unique request ID to every request/response, used for tracing
 * a request through logs, error responses, and (in Phase 2 modules) audit
 * log entries. Accepts an inbound X-Request-Id header too, so it composes
 * correctly if ClubHub is ever put behind a gateway that already sets one.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.setHeader("x-request-id", requestId);
  next();
}
