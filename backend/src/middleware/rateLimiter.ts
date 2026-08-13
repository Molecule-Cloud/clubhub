import rateLimit from "express-rate-limit";
import { env } from "../lib/env";

/** General API rate limit — generous, just a backstop against abuse. */
export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many requests, slow down." } },
});

/**
 * Tighter limit for auth endpoints (login, OTP, password reset) — these are
 * the targets of credential-stuffing and OTP brute-force attacks, so they
 * get a much stricter budget than general API traffic.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." },
  },
});
