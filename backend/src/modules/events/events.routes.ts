import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authGuard } from "../../middleware/authGuard";
import { tenantContextMiddleware } from "../../middleware/tenantContext";
import { requirePermission } from "../../middleware/requirePermission";
import * as controller from "./events.controller";
import {
  createEventSchema,
  updateEventSchema,
  eventIdParamSchema,
  listEventsSchema,
  checkInSchema,
  staffCheckInSchema,
  recordAttendanceSchema,
} from "./events.validation";

const router = Router();

router.use(authGuard, tenantContextMiddleware);

// --- Viewing & self-service (any authenticated member) ---
router.get("/", validate(listEventsSchema), asyncHandler(controller.listEvents));
router.get("/:eventId", validate(eventIdParamSchema), asyncHandler(controller.getEvent));
router.post("/:eventId/register", validate(eventIdParamSchema), asyncHandler(controller.registerForEvent));
router.delete("/:eventId/register", validate(eventIdParamSchema), asyncHandler(controller.cancelRegistration));
router.post("/:eventId/checkin", validate(checkInSchema), asyncHandler(controller.selfCheckIn));

// --- General (non-event) attendance recording ---
router.post(
  "/attendance",
  requirePermission("attendance:manage"),
  validate(recordAttendanceSchema),
  asyncHandler(controller.recordGeneralAttendance)
);

// --- Management (events:manage) ---
router.post("/", requirePermission("events:manage"), validate(createEventSchema), asyncHandler(controller.createEvent));
router.patch(
  "/:eventId",
  requirePermission("events:manage"),
  validate(updateEventSchema),
  asyncHandler(controller.updateEvent)
);
router.delete(
  "/:eventId",
  requirePermission("events:manage"),
  validate(eventIdParamSchema),
  asyncHandler(controller.deleteEvent)
);
router.get(
  "/:eventId/checkin-qr",
  requirePermission("events:manage"),
  validate(eventIdParamSchema),
  asyncHandler(controller.getCheckinQrCode)
);
router.get(
  "/:eventId/registrations",
  requirePermission("events:manage"),
  validate(eventIdParamSchema),
  asyncHandler(controller.listRegistrations)
);

// --- Attendance (attendance:manage) ---
router.post(
  "/:eventId/checkin/:membershipId",
  requirePermission("attendance:manage"),
  validate(staffCheckInSchema),
  asyncHandler(controller.staffCheckIn)
);
router.get(
  "/:eventId/attendance",
  requirePermission("attendance:manage"),
  validate(eventIdParamSchema),
  asyncHandler(controller.listAttendance)
);

export default router;
