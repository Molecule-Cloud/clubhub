import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authGuard } from "../../middleware/authGuard";
import { tenantContextMiddleware } from "../../middleware/tenantContext";
import { requirePermission } from "../../middleware/requirePermission";
import * as controller from "./payments.controller";
import {
  createCategorySchema,
  updateCategorySchema,
  initializePaymentSchema,
  recordManualPaymentSchema,
  listPaymentsSchema,
  paymentIdParamSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
} from "./payments.validation";

const router = Router();

// --- Webhook: Paystack calls this directly. No authGuard (Paystack isn't a
// logged-in member) — authenticity comes from HMAC signature verification
// inside the controller, not from a Bearer token. Must stay unauthenticated
// at the route level or Paystack's calls would be rejected outright. ---
router.post("/webhook/paystack", asyncHandler(controller.paystackWebhook));

// --- Everything below requires an authenticated member ---
router.use(authGuard, tenantContextMiddleware);

// Categories
router.get("/categories", asyncHandler(controller.listCategories));
router.post(
  "/categories",
  requirePermission("payments:categories:manage"),
  validate(createCategorySchema),
  asyncHandler(controller.createCategory)
);
router.patch(
  "/categories/:categoryId",
  requirePermission("payments:categories:manage"),
  validate(updateCategorySchema),
  asyncHandler(controller.updateCategory)
);

// Member-initiated payments
router.post("/initialize", validate(initializePaymentSchema), asyncHandler(controller.initializePayment));
router.get("/verify/:reference", validate(verifyPaymentSchema), asyncHandler(controller.verifyPayment));
router.get("/me", asyncHandler(controller.listMyPayments));

// Treasurer / admin
router.post(
  "/manual",
  requirePermission("payments:approve"),
  validate(recordManualPaymentSchema),
  asyncHandler(controller.recordManualPayment)
);
router.get(
  "/",
  requirePermission("payments:view"),
  validate(listPaymentsSchema),
  asyncHandler(controller.listPayments)
);
router.get("/:paymentId", requirePermission("payments:view"), validate(paymentIdParamSchema), asyncHandler(controller.getPayment));
router.post(
  "/:paymentId/refund",
  requirePermission("payments:approve"),
  validate(refundPaymentSchema),
  asyncHandler(controller.refundPayment)
);

export default router;
