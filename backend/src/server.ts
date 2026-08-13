import { createApp } from "./app";
import { env } from "./lib/env";
import { logger } from "./lib/logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 ClubHub API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown — let in-flight requests finish before exiting, so a
// deploy/restart doesn't drop active requests (e.g. mid-payment webhook).
function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
