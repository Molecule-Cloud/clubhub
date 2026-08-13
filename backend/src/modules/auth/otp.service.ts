import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { env } from "../../lib/env";
import { ApiError } from "../../utils/ApiError";
import { sendEmail } from "../../lib/mailer";

type OtpPurpose = "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN_2FA";

function generateCode(): string {
  // 6-digit numeric, zero-padded — randomInt is CSPRNG-backed, not Math.random.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function issueOtp(userId: string, email: string, purpose: OtpPurpose) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { userId, code, purpose, expiresAt },
  });

  const subjectByPurpose: Record<OtpPurpose, string> = {
    EMAIL_VERIFICATION: "Verify your ClubHub account",
    PASSWORD_RESET: "Reset your ClubHub password",
    LOGIN_2FA: "Your ClubHub login code",
  };

  await sendEmail({
    to: email,
    subject: subjectByPurpose[purpose],
    html: `<p>Your ClubHub verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in ${env.OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

/**
 * Verifies a submitted OTP. Attempts are counted per-code (not just per
 * lookup) so a code can't be brute-forced even within its validity window —
 * OTP_MAX_ATTEMPTS wrong guesses permanently burns that code.
 */
export async function verifyOtp(userId: string, code: string, purpose: OtpPurpose) {
  const otp = await prisma.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw ApiError.badRequest("No active verification code found. Please request a new one.");
  }

  if (otp.expiresAt < new Date()) {
    throw ApiError.badRequest("Verification code expired. Please request a new one.");
  }

  if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw ApiError.badRequest("Too many incorrect attempts. Please request a new code.");
  }

  if (otp.code !== code) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest("Incorrect verification code.");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}
