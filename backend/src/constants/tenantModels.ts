/**
 * Every Prisma model that carries an `organizationId` column belongs here.
 * The tenant-scoping Prisma extension (see lib/prisma.ts) reads this list to
 * decide which queries need automatic organizationId injection.
 *
 * IMPORTANT: when a new tenant-scoped model is added to schema.prisma, it
 * MUST be added here too, or it will NOT be tenant-isolated. Consider this
 * the single most security-critical file in the backend.
 */
export const TENANT_SCOPED_MODELS = new Set([
  "Membership",
  "Invitation",
  "Role",
  "Payment",
  "PaymentCategory",
  "Receipt",
  "Project",
  "Event",
  "Attendance",
  "Announcement",
  "AuditLog",
]);

// Models that are deliberately NOT tenant-scoped (global catalogs, or the
// tenancy root itself). Listed explicitly so a reviewer can see this was a
// decision, not an oversight.
export const GLOBAL_MODELS = new Set([
  "Organization", // the tenant root — has no parent to scope against
  "User", // identity is global; Membership is what scopes a User to an org
  "Permission", // fixed platform-wide catalog
  "RolePermission", // scoped transitively via Role
  "RefreshToken", // scoped via User
  "OtpCode", // scoped via User
  "ProjectMilestone", // scoped transitively via Project
  // ProjectContribution has NO organizationId column in schema.prisma —
  // it was previously (incorrectly) listed as tenant-scoped, which made
  // the Prisma extension try to inject an organizationId filter/field into
  // every query against it. Since that column doesn't exist, this failed
  // with a Prisma validation error on every single call, unconditionally —
  // not a timing bug, a straightforward config/schema mismatch. Fixed by
  // moving it here: it's scoped transitively via Project, same pattern as
  // ProjectMilestone directly above.
  "ProjectContribution",
  "EventRegistration",
]);
