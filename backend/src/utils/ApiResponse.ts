import { Response } from "express";

/**
 * Every successful response follows the same envelope so frontend clients
 * (website, admin, mobile) can share one API client / response parser.
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Record<string, unknown>) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}
