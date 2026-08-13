import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { logger } from "../lib/logger";
import { isProd } from "../lib/env";

/**
 * Centralized error handler. Registered as the LAST middleware in app.ts.
 * Translates known error types (ApiError, ZodError, Prisma errors) into a
 * consistent JSON shape; anything unrecognized is logged with full detail
 * server-side but returned to the client as a generic 500 — we never leak
 * stack traces, SQL, or internal error messages to API consumers.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = res.getHeader("x-request-id");

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      requestId,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.flatten().fieldErrors,
      },
      requestId,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint violation — the most common one worth a
    // friendly message; everything else falls through to generic 500.
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: { code: "CONFLICT", message: "A record with this value already exists." },
        requestId,
      });
    }
  }

  logger.error({ err, requestId, path: req.path, method: req.method }, "Unhandled error");

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: isProd ? "Something went wrong. Please try again." : String(err),
    },
    requestId,
  });
}
