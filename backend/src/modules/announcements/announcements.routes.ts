import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authGuard } from "../../middleware/authGuard";
import { tenantContextMiddleware } from "../../middleware/tenantContext";
import { requirePermission } from "../../middleware/requirePermission";
import * as controller from "./announcements.controller";
import { createAnnouncementSchema, listAnnouncementsSchema, announcementIdParamSchema } from "./announcements.validation";

const router = Router();

router.use(authGuard, tenantContextMiddleware);

router.get("/", validate(listAnnouncementsSchema), asyncHandler(controller.listAnnouncements));
router.get("/:announcementId", validate(announcementIdParamSchema), asyncHandler(controller.getAnnouncement));

router.post(
  "/",
  requirePermission("announcements:send"),
  validate(createAnnouncementSchema),
  asyncHandler(controller.createAnnouncement)
);

export default router;
