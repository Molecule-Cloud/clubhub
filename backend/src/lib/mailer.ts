import nodemailer from "nodemailer";
import { env, isProd } from "./env";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  if (!env.SMTP_HOST) {
    // No SMTP configured (local dev) — log instead of throwing, so auth
    // flows are still testable without real email infrastructure.
    logger.warn({ to, subject }, "SMTP not configured — email not sent (dev mode)");
    return;
  }

  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
    if (isProd) throw err; // don't silently swallow failures in production
  }
}
