import pino from "pino";
import { isProd } from "./env";

export const logger = pino({
  level: isProd ? "info" : "debug",
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
  redact: {
    // Never let secrets or PII hit log storage, even by accident.
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.tokenHash",
      "*.otp",
      "*.code",
    ],
    censor: "[REDACTED]",
  },
});
