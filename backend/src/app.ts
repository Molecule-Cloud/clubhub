import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { requestIdMiddleware } from "./middleware/requestId";
import { generalRateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import membersRoutes from "./modules/members/members.routes";
import paymentsRoutes from "./modules/payments/payments.routes";
import eventsRoutes from "./modules/events/events.routes";
import projectsRoutes from "./modules/projects/projects.routes";
import announcementsRoutes from "./modules/announcements/announcements.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import organizationsRoutes from "./modules/organizations/organizations.routes";

export function createApp() {
  const app = express();

  // Trust the first proxy hop (Railway/Vercel sit in front of us) so
  // req.ip and rate-limiting see the real client IP, not the proxy's.
  app.set("trust proxy", 1);

  // --- Security & parsing (order matters: these run on every request) ---
  app.use(helmet());
  app.use(
    cors({
      origin: [env.CLIENT_URL, env.ADMIN_URL],
      credentials: true, // required so the refresh-token httpOnly cookie is sent cross-origin
    })
  );
  app.use(
    express.json({
      limit: "2mb",
      // Captures the exact raw bytes of every JSON request body. Needed
      // because Paystack's webhook signature is an HMAC over the raw bytes
      // they sent — re-serializing the parsed JSON can produce a different
      // byte sequence (key order, whitespace) and break verification.
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(pinoHttp({ logger }));
  app.use(generalRateLimiter);

  // --- Health check (unauthenticated, unversioned — for load balancers) ---
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  // --- API routes ---
  // NOTE: authGuard + tenantContextMiddleware are applied per-module-router
  // (not globally here) because auth routes and the Paystack webhook are
  // pre-authentication. This completes Phase 2's backend API surface —
  // remaining work is Phase 3 (Admin Dashboard), Phase 4 (Mobile App),
  // Phase 5 (Testing), Phase 6 (Deployment).
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/members", membersRoutes);
  app.use("/api/v1/payments", paymentsRoutes);
  app.use("/api/v1/events", eventsRoutes);
  app.use("/api/v1/projects", projectsRoutes);
  app.use("/api/v1/announcements", announcementsRoutes);
  app.use("/api/v1/reports", reportsRoutes);
  app.use("/api/v1/organizations", organizationsRoutes);

  // --- 404 for anything unmatched ---
  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` } });
  });

  // --- Centralized error handler — MUST be registered last ---
  app.use(errorHandler);

  return app;
}
