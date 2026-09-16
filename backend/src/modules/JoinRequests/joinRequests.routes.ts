import { Router } from "express";import { listJoinRequests, approveJoinrequest, rejectJoinrequest } from "./joinRequests.controller";
import { asyncHandler } from "@/utils/asyncHandler";
import { validate } from "@/middleware/validate";
import { authGuard } from "@/middleware/authGuard";
import { tenantContextMiddleware } from "@/middleware/tenantContext";
import { requirePermission } from "@/middleware/requirePermission";
import { 
  listJoinRequestSchema,
  approveJoinRequestSchema,
  rejectJoinRequestSchema,
} from "./joinRequests.validation";


const router = Router();
/**
 * Everything here is on the Admin Side and requires an authenticated member
 * The public, unauthenticated submission endpoint(POST a joijnrequest)
 * Lives in the separate public module, mounted at /api/v1/public
 */

router.use(authGuard, tenantContextMiddleware);

router.get("/", requirePermission("members:approve-requests"),
  validate(listJoinRequestSchema),
  asyncHandler(listJoinRequests)
);

router.post("/:joinRequestId/approve", requirePermission("members:approve-requests"),
  validate(approveJoinRequestSchema),
  asyncHandler(approveJoinrequest)
);

router.post("/:joinRequestId/reject", requirePermission("members:approve-requests"),
  validate(rejectJoinRequestSchema),
  asyncHandler(rejectJoinrequest)
);

export default router;



