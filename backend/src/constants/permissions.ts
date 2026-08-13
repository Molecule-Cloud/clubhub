/**
 * The fixed, platform-wide permission catalog. Permissions themselves are
 * global (see schema.prisma) — what's customizable per-organization is which
 * Roles grant which of these permissions (via RolePermission).
 */
export const PERMISSIONS = [
  { key: "members:invite", description: "Invite new members to the organization" },
  { key: "members:manage", description: "Edit or remove member records" },
  { key: "roles:manage", description: "Create, edit, or assign roles" },
  { key: "payments:view", description: "View payment records" },
  { key: "payments:approve", description: "Approve or reconcile payments" },
  { key: "payments:categories:manage", description: "Create or edit payment categories" },
  { key: "projects:manage", description: "Create or edit projects" },
  { key: "events:manage", description: "Create or edit events" },
  { key: "attendance:manage", description: "Record or edit attendance" },
  { key: "announcements:send", description: "Send announcements to members" },
  { key: "reports:view", description: "View financial and membership reports" },
  { key: "organization:settings:manage", description: "Edit organization branding and settings" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

/**
 * Default roles seeded for every new organization at signup. Orgs can
 * rename these or create entirely custom roles afterward — this is just
 * the sensible starting point so a new club isn't staring at an empty
 * roles list on day one.
 */
export const DEFAULT_ROLE_TEMPLATES: { name: string; permissions: PermissionKey[] }[] = [
  {
    name: "President",
    permissions: PERMISSIONS.map((p) => p.key), // full access
  },
  {
    name: "Secretary",
    permissions: [
      "members:invite",
      "members:manage",
      "events:manage",
      "attendance:manage",
      "announcements:send",
      "reports:view",
    ],
  },
  {
    name: "Treasurer",
    permissions: [
      "payments:view",
      "payments:approve",
      "payments:categories:manage",
      "reports:view",
    ],
  },
  {
    name: "Club Admin",
    permissions: PERMISSIONS.map((p) => p.key), // full access, same as President
  },
  {
    name: "Committee Chair",
    permissions: ["projects:manage", "events:manage", "attendance:manage", "reports:view"],
  },
  {
    name: "Member",
    permissions: [], // baseline — members act on their own records via dedicated endpoints,
    // not via these org-management permissions
  },
];
