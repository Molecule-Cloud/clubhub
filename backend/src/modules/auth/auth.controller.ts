import { Request, Response } from "express";
import { isProd } from "../../lib/env";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import * as authService from "./auth.service";

const REFRESH_COOKIE_NAME = "clubhub_refresh_token";

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    expires: expiresAt,
    path: "/api/v1/auth", // scoped narrowly — this cookie is only needed by auth endpoints
  });
}

export async function registerOrganization(req: Request, res: Response) {
  const result = await authService.registerOrganization(req.body);
  return sendSuccess(res, result, 201);
}

export async function verifyEmail(req: Request, res: Response) {
  await authService.confirmEmailVerification(req.body.userId, req.body.code);
  return sendSuccess(res, { message: "Email verified successfully." });
}

export async function resendOtp(req: Request, res: Response) {
  const result = await authService.resendOtp(req.body.userId, req.body.purpose);
  return sendSuccess(res, result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
  return sendSuccess(res, {
    accessToken: result.accessToken,
    // Also returned in the body, not just the httpOnly cookie: native
    // mobile clients have no cookie jar and must store this explicitly
    // (in Keychain/Keystore via expo-secure-store). Web clients can safely
    // ignore this field and rely on the cookie as before — returning it
    // doesn't weaken web's security posture, it just also serves the
    // client type that never had cookie-based protection available.
    refreshToken: result.refreshToken,
    user: result.user,
    organization: result.organization,
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.body.refreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No refresh token provided" } });
  }
  const result = await authService.refresh(token);
  setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
  // Same reasoning as login(): the rotated token must reach native clients
  // via the body, since they can't read it off a Set-Cookie header.
  return sendSuccess(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
}

export async function logout(req: Request, res: Response) {
  const token = req.body.refreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
  return sendSuccess(res, { message: "Logged out." });
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.requestPasswordReset(req.body.email);
  return sendSuccess(res, result);
}

export async function getCurrentUser(req: Request, res: Response) {
  const result = await authService.getCurrentUser(req.auth!.userId, req.auth!.organizationId);
  return sendSuccess(res, result);
}

export async function updateProfile(req: Request, res: Response) {
  const result = await authService.updateProfile(req.auth!.userId, req.body);
  return sendSuccess(res, result);
}

export async function updateAvatar(req: Request, res: Response) {
  if (!req.file) throw ApiError.badRequest("No avatar file was provided.");
  const result = await authService.updateAvatar(req.auth!.userId, req.file.buffer);
  return sendSuccess(res, result);
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.userId, req.body.code, req.body.newPassword);
  return sendSuccess(res, { message: "Password reset successfully. Please log in again." });
}

// Referenced by cookie-parser setup in app.ts — exported for reuse.
export { REFRESH_COOKIE_NAME };
