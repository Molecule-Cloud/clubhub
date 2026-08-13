import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authGuard } from "../../middleware/authGuard";
import { tenantContextMiddleware } from "../../middleware/tenantContext";
import { requirePermission } from "../../middleware/requirePermission";
import { handleLogoUpload } from "../../middleware/upload";
import * as controller from "./organizations.controller";
import { updateOrganizationSchema } from "./organizations.validation";

const router = Router();

router.use(authGuard, tenantContextMiddleware);

router.get("/me", asyncHandler(controller.getCurrentOrganization));

router.patch(
  "/me",
  requirePermission("organization:settings:manage"),
  validate(updateOrganizationSchema),
  asyncHandler(controller.updateOrganization)
);

router.post(
  "/me/logo",
  requirePermission("organization:settings:manage"),
  handleLogoUpload,
  // Re-run tenantContextMiddleware AFTER the multer upload completes, not
  // just once at the top of this router. AsyncLocalStorage context is not
  // reliably preserved across multer/busboy's stream-based multipart body
  // parsing — for a file large enough to arrive over multiple TCP
  // segments, the context established by the router-level middleware can
  // be lost by the time control reaches the controller. Re-establishing it
  // here (reading the same req.auth set by authGuard, which IS preserved —
  // it's a plain property on the request object, not ALS-based) closes
  // that gap: there's no async work between this middleware and the
  // controller that could lose the context again. Calling it twice per
  // request is harmless — it just re-derives the same values.
  tenantContextMiddleware,
  asyncHandler(controller.updateLogo)
);

export default router;
