import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authRateLimiter } from "../../middleware/rateLimiter";
import * as controller from "./public.controller";
import { listPublicEventsSchema, publicEventIdParamSchema } from "./public.validation";
import { createJoinRequestSchema } from "../JoinRequests/joinRequests.validation";

// Entirely unauthenticated — reachable by anonymous internet traffic.
// No authGuard, no tenantContextMiddleware, anywhere in this file. Every
// query this hits must be safe to run with no request context at all.
const router = Router();

router.get("/events", validate(listPublicEventsSchema), asyncHandler(controller.listPublicEvents));
router.get("/events/:eventId", validate(publicEventIdParamSchema), asyncHandler(controller.getPublicEvent));

// Rate-limited like other unauthenticated write endpoints (matches
// /members/accept-invitation) — this is a public POST anyone can hit.
router.post(
  "/organizations/:slug/join-requests",
  authRateLimiter,
  validate(createJoinRequestSchema),
  asyncHandler(controller.createJoinRequest)
);

export default router;