import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authRateLimiter } from "../../middleware/rateLimiter";
import { authGuard } from "../../middleware/authGuard";
import { tenantContextMiddleware } from "../../middleware/tenantContext";
import { handleAvatarUpload } from "../../middleware/upload";
import * as controller from "./auth.controller";
import {
  registerOrganizationSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./auth.validation";

const router = Router();

// All auth endpoints are rate-limited — these are the highest-value targets
// for credential stuffing / brute force on the whole platform.
router.use(authRateLimiter);

router.post(
  "/register-organization",
  validate(registerOrganizationSchema),
  asyncHandler(controller.registerOrganization)
);

router.post("/verify-email", validate(verifyOtpSchema), asyncHandler(controller.verifyEmail));

router.post("/resend-otp", validate(resendOtpSchema), asyncHandler(controller.resendOtp));

router.post("/login", validate(loginSchema), asyncHandler(controller.login));

router.post("/refresh", validate(refreshSchema), asyncHandler(controller.refresh));

router.post("/logout", validate(refreshSchema), asyncHandler(controller.logout));

router.post("/forgot-password", validate(forgotPasswordSchema), asyncHandler(controller.forgotPassword));

router.post("/reset-password", validate(resetPasswordSchema), asyncHandler(controller.resetPassword));

router.get("/me", authGuard, tenantContextMiddleware, asyncHandler(controller.getCurrentUser));

router.patch("/me", authGuard, validate(updateProfileSchema), asyncHandler(controller.updateProfile));

router.post("/me/avatar", authGuard, handleAvatarUpload, asyncHandler(controller.updateAvatar));

export default router;
