# ClubHub — Phase 1 Architecture

**Movax Technologies Ltd** · One Platform. Every Club. Unlimited Possibilities.

---

## 1. Multi-Tenancy Strategy

**Decision: Shared database, shared schema, discriminator column (`organizationId`).**

| Strategy | Verdict | Why |
|---|---|---|
| Database-per-tenant | ❌ Rejected | Doesn't scale operationally past a few dozen orgs. Migrations, backups, and connection pooling all multiply per tenant. |
| Schema-per-tenant | ❌ Rejected | Prisma migration tooling assumes one schema. Dynamic schema provisioning on signup is fragile and hard to automate safely. |
| Shared schema + `organizationId` | ✅ Chosen | One migration path, one connection pool, scales horizontally. Isolation enforced in two layers (below). |

### Enforcement — two layers of defense

1. **Application layer:** A Prisma Client Extension (`$extends`) wraps every query on tenant-scoped models and automatically injects `where: { organizationId }` from the authenticated request context (AsyncLocalStorage-based request-scoped context, not a global). Engineers cannot forget this — it's structurally impossible to bypass without deliberately opting out.
2. **Database layer:** PostgreSQL Row-Level Security (RLS) policies on every tenant table, keyed off a session variable (`app.current_org_id`) set per-transaction. This is the safety net if application code ever has a bug — the database itself refuses to return rows outside the tenant.

Every tenant-scoped table carries `organizationId` as a required, indexed foreign key. Composite indexes are `(organizationId, <common filter column>)` throughout, since every query filters by org first.

---

## 2. Monorepo Structure

**Decision: Turborepo**, chosen over Nx for lighter config overhead and native alignment with the Vercel deployment target for `apps/website` and `apps/admin`.

```
clubhub/
├── apps/
│   ├── website/          # Next.js 15 — public marketing site
│   ├── admin/            # Next.js 15 — web admin portal
│   └── mobile/           # React Native (Expo) — member app
├── packages/
│   ├── ui/                # shared shadcn/ui component library
│   ├── config/            # shared eslint, tsconfig, tailwind config
│   └── types/             # shared TypeScript types (mirrors Prisma models)
├── backend/
│   ├── src/
│   │   ├── modules/        # feature modules (auth, members, payments, events...)
│   │   ├── middleware/      # tenant resolution, auth guard, rate limiter, error handler
│   │   ├── lib/             # prisma client, redis, cloudinary, paystack clients
│   │   └── jobs/            # scheduled jobs (dues reminders, receipt cleanup)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── tests/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md              # populated in Phase 2
│   └── ERD.md
├── turbo.json
└── package.json
```

**Why `mobile` under `apps/` rather than a separate repo:** shares `packages/types` and `packages/config` directly, so a Prisma model change flows through to mobile type-checking without manual syncing.

---

## 3. Authentication Design

**Decision: JWT access tokens + rotating refresh tokens + OTP.**

- **Access token:** JWT, 15-minute expiry, signed with `RS256` (asymmetric — lets you verify tokens in multiple services later without sharing the signing key), carries `userId`, `organizationId`, `roleId`.
- **Refresh token:** Opaque random token (not a JWT), 30-day expiry, stored **hashed** (SHA-256) in `RefreshToken` table, delivered via `httpOnly`, `Secure`, `SameSite=Strict` cookie for web; secure storage (Keychain/Keystore) for mobile.
  - **Rotation on every use:** each refresh issues a new refresh token and invalidates the old one. If an already-used (revoked) token is presented again, every token in that session family is revoked — this is the standard signal of token theft.
- **OTP:** 6-digit, 10-minute expiry, rate-limited to 5 attempts, used for both email verification on registration and password-reset confirmation. One mechanism, two flows.
- **Password storage:** `bcrypt`, cost factor 12.

---

## 4. Roles & Permissions

**Decision: relational `Role` + `Permission`, scoped per organization — not a hardcoded enum.**

Each organization gets seeded with default roles (President, Secretary, Treasurer, Club Admin, Committee Chair, Member) on creation, but can rename, add, or adjust permission grants without a code deploy. Permissions are checked via a `hasPermission(userId, orgId, 'payments:approve')` guard in middleware, not scattered role-string checks.

---

## 5. Audit Logging

Every mutation on financially or organizationally sensitive tables (payments, member records, role changes, receipts) writes an `AuditLog` entry: who, what, before/after diff (JSON), IP, timestamp. This is non-negotiable for a platform handling club treasuries.

---

## 6. What's in the Prisma schema (Phase 1 scope)

Core models only — enough to support auth, org onboarding, membership, and the skeleton for payments/projects/events that Phase 2 will build APIs against:

`Organization`, `User`, `Membership`, `Role`, `Permission`, `RolePermission`, `RefreshToken`, `OtpCode`, `Payment`, `PaymentCategory`, `Receipt`, `Project`, `ProjectContribution`, `Event`, `EventRegistration`, `Attendance`, `Announcement`, `AuditLog`.

See `backend/prisma/schema.prisma`.
