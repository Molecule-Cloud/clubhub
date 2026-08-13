import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authGuard } from "../../middleware/authGuard";
import { tenantContextMiddleware } from "../../middleware/tenantContext";
import { requirePermission } from "../../middleware/requirePermission";
import * as controller from "./reports.controller";
import {
  revenueReportSchema,
  attendanceReportSchema,
  membershipGrowthSchema,
  exportPaymentsSchema,
} from "./reports.validation";

const router = Router();

// Every report in this module requires reports:view — financial and
// membership data is sensitive even in read-only form.
router.use(authGuard, tenantContextMiddleware, requirePermission("reports:view"));

router.get("/revenue", validate(revenueReportSchema), asyncHandler(controller.getRevenueSummary));
router.get("/revenue/by-category", validate(revenueReportSchema), asyncHandler(controller.getRevenueByCategory));
router.get("/outstanding-dues", validate(revenueReportSchema), asyncHandler(controller.getOutstandingDues));

router.get("/membership/growth", validate(membershipGrowthSchema), asyncHandler(controller.getMembershipGrowth));
router.get("/membership/breakdown", asyncHandler(controller.getMembershipBreakdown));

router.get("/attendance", validate(attendanceReportSchema), asyncHandler(controller.getAttendanceSummary));

router.get("/projects/funding", asyncHandler(controller.getProjectsFundingSummary));

router.get("/export/payments.csv", validate(exportPaymentsSchema), asyncHandler(controller.exportPaymentsCsv));

export default router;
