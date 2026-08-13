import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authGuard } from "../../middleware/authGuard";
import { tenantContextMiddleware } from "../../middleware/tenantContext";
import { requirePermission } from "../../middleware/requirePermission";
import * as controller from "./projects.controller";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  listProjectsSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from "./projects.validation";

const router = Router();

router.use(authGuard, tenantContextMiddleware);

// Viewing projects is open to all members — no special permission required.
// Contributing to a project happens via POST /payments/initialize with a
// PROJECT_CONTRIBUTION category and projectId, not through this router.
router.get("/", validate(listProjectsSchema), asyncHandler(controller.listProjects));
router.get("/:projectId", validate(projectIdParamSchema), asyncHandler(controller.getProject));

router.post(
  "/",
  requirePermission("projects:manage"),
  validate(createProjectSchema),
  asyncHandler(controller.createProject)
);
router.patch(
  "/:projectId",
  requirePermission("projects:manage"),
  validate(updateProjectSchema),
  asyncHandler(controller.updateProject)
);

router.post(
  "/:projectId/milestones",
  requirePermission("projects:manage"),
  validate(createMilestoneSchema),
  asyncHandler(controller.createMilestone)
);
router.patch(
  "/:projectId/milestones/:milestoneId",
  requirePermission("projects:manage"),
  validate(updateMilestoneSchema),
  asyncHandler(controller.updateMilestone)
);

export default router;
