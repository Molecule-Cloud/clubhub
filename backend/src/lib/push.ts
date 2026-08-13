import { env } from "./env";
import { logger } from "./logger";

interface SendPushInput {
  organizationId: string;
  title: string;
  body: string;
}

/**
 * Firebase Cloud Messaging integration is NOT wired up with real credentials
 * in Phase 2 — FIREBASE_* env vars are reserved (see .env.example) but the
 * actual firebase-admin SDK call is deliberately not implemented here,
 * since it also requires a device-token registry (which user/device
 * associates with which FCM token) that doesn't exist yet — that's a
 * mobile-app-integration concern belonging to Phase 4, not Phase 2's
 * backend-only scope.
 *
 * Mirrors lib/mailer.ts's pattern: log and no-op rather than throw, so
 * announcement creation still succeeds end-to-end without push configured.
 * Returns whether a "send" was attempted, for the Announcement.sentPush flag.
 */
export async function sendPushNotification(input: SendPushInput): Promise<boolean> {
  if (!env.FIREBASE_PROJECT_ID) {
    logger.warn(
      { organizationId: input.organizationId, title: input.title },
      "Firebase not configured — push notification not sent (Phase 4 will wire this to device tokens)"
    );
    return false;
  }

  // TODO(Phase 4 — Mobile App): implement firebase-admin messaging.send()
  // against a DeviceToken table (userId -> FCM token, registered on app
  // login) once the mobile app exists to register tokens against.
  logger.warn({ organizationId: input.organizationId }, "Firebase configured but push sending not yet implemented");
  return false;
}
