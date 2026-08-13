# ClubHub — Setup Guide

## Structure
```
clubhub/
├── docs/ARCHITECTURE.md   Phase 1 — architecture & design decisions
├── backend/                Phase 2 — Express + Prisma API (complete)
├── apps/admin/              Phase 3 — Next.js admin dashboard (near feature-complete)
└── apps/mobile/             Phase 4 — Expo/React Native member app (feature-complete)
```

## Backend setup
```bash
cd backend
npm install
npx prisma generate
openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem
cp .env.example .env   # fill in DATABASE_URL, JWT keys, Paystack, Cloudinary, CLIENT_URL, ADMIN_URL
npx prisma migrate dev --name init
npm run dev             # http://localhost:4000
```

**Row-Level Security**: `prisma/reference/enable_row_level_security.sql` is a plain
reference file, not a pre-built migration. Apply it via:
```bash
npx prisma migrate dev --create-only --name enable_row_level_security
# paste the reference SQL into the migration.sql file this creates, then:
npx prisma migrate dev
```

Paystack webhook: `https://<your-api-domain>/api/v1/payments/webhook/paystack`.
Cloudinary required (receipts, org logos, user avatars). SMTP required for OTP delivery
in dev (otherwise codes log to console).

## Admin dashboard setup
```bash
cd apps/admin
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > .env.local
npm run dev             # http://localhost:3000
```
Visit `/signup` to create an organization entirely through the UI.

## Mobile app setup
```bash
cd apps/mobile
npm install
npx expo start
```
Edit `app.json`'s `expo.extra.apiUrl` to your machine's LAN IP (not `localhost`). Requires
an existing verified member account — mobile only supports logging in, not organization
creation (admin-only, by design).

## What's built — full picture

**Phase 1**: architecture, multi-tenant strategy, Prisma schema

**Phase 2** (complete): Auth (incl. resend-OTP, profile editing, avatar upload), Members,
Payments (Paystack + manual + refunds, mobile deep-link callback support), Events
(+ QR check-in, per-member registration status), Projects, Announcements, Reports,
Organizations/Settings, Roles & Permissions CRUD — full REST API

**Phase 3** (near feature-complete): full admin dashboard — members, payments, events,
projects, settings/branding, roles & permissions, signup wizard, mobile-responsive shell

**Phase 4** (feature-complete against original spec's member-app requirements):
- Digital Membership Card (server-rendered QR)
- Payments — Paystack checkout, history, receipts
- Events — browse, register/cancel, QR self-check-in via camera scan
- **Profile editing** (this delivery) — name, phone, avatar upload, all reflected
  immediately via a `refreshUser()` call rather than a stale cache

## Verification performed this round (read this before assuming "tested" means "verified live")

I do not have a running Postgres instance, a physical device, or a browser in my
environment — I cannot click through this app myself. What I *did* verify, thoroughly:

1. **Full type-check** of all three codebases (`tsc --noEmit` for backend and mobile,
   full `next build` for admin) — zero errors outside one pre-existing, understood gap
   (backend's Prisma client can't be generated in my sandbox; resolves automatically once
   you run `prisma generate` with real network access, which you've already confirmed
   works on your machine).
2. **Complete API contract audit** — every single API call in both the admin app and the
   mobile app, cross-referenced against the backend's actual route table: method, path,
   and response shape. Extended this round to cover every mobile call added across all
   three Phase 4 chunks. Zero mismatches found.
3. **Response shape consistency audit** — checked that `/auth/login`, `/auth/refresh`, and
   `/auth/me` all return structurally consistent user/organization objects, so a client
   never has stale or missing fields depending on which endpoint it last hit.
4. **Debug code sweep** — grepped all three codebases for stray `console.log` statements.
   None found in shipped code (the one your own testing surfaced was in *your* uploaded
   copy, not mine — flagged separately, not reintroduced here).
5. **TODO/FIXME sweep** — exactly one remains, the deliberately-deferred push notification
   implementation (needs a Firebase project, which is your infrastructure decision to make,
   not a code gap).

**What this does NOT verify**: actual runtime behavior against a live database, real
Paystack test-mode checkout completing end-to-end, real camera QR scanning on a physical
device, real Cloudinary uploads, or how the app actually feels to use. That needs you (or
a human tester) to actually run it — which is exactly what you did last round, and what
surfaced the real migration-ordering bug that no amount of static analysis would have
caught, since it was a Prisma CLI behavior issue, not a code defect.

### Fixed this round: missing invite-acceptance page
The invite email link (`/join/:slug?token=...`) pointed to a page that never existed —
found while writing the full testing guide (`docs/TESTING-GUIDE.md`), which needed to
actually walk through inviting a second member to test mobile with. Now built:
`apps/admin/app/(auth)/join/[slug]/page.tsx`.


### Fixed this round: logo upload crashed with a 500 (AsyncLocalStorage context loss)
Real bug surfaced by your testing, not a hypothetical: uploading an organization logo
threw `getRequestContext() called outside of a request context`. Root cause — the
tenant-scoping context is established once via AsyncLocalStorage at the top of the
organizations router, but AsyncLocalStorage context is not reliably preserved across
multer/busboy's stream-based multipart body parsing for large-enough files (yours was
~900KB, arriving over multiple TCP segments). By the time the controller ran, the async
context had been lost.

Fixed in `backend/src/modules/organizations/organizations.routes.ts`: the tenant context
middleware now runs a second time, positioned immediately after the file upload completes
and right before the controller — closing the async gap that could lose it. Confirmed this
is the only route in the codebase combining file upload with tenant-context-dependent
service logic (the user avatar upload route needs no tenant context at all, so it was
never exposed to this bug).


### Fixed this round: two real bugs from your testing

**1. Payments failing — a definite, always-reproducing bug, not a timing issue.**
`ProjectContribution` was listed in `TENANT_SCOPED_MODELS` (telling the Prisma extension
to inject an `organizationId` filter into every query against it), but the actual table
has no `organizationId` column at all. Every payment settling into a project contribution
failed with a Prisma validation error, unconditionally. Fixed by moving it to
`GLOBAL_MODELS` with a "scoped transitively via Project" note — the same pattern already
used for `ProjectMilestone`.

While tracing this, also hardened `settleSuccessfulPayment` and `recordManualPayment`
against the same category of risk confirmed by the logo-upload bug: the receipt PDF
upload to Cloudinary is a stream-based operation, and any tenant-context-dependent code
that runs *after* it (a `Project` update, an audit log write) can no longer trust the
ambient `AsyncLocalStorage` context survived. Fixed by making those calls either use data
already in hand (no ambient context needed) or explicitly re-establishing context via
`runWithContext()` before continuing.

**2. Reports page — a genuine 404, not a bug.** It was linked in the sidebar navigation
from Phase 3 but the page itself was never built. Now built at
`apps/admin/app/(dashboard)/dashboard/reports/page.tsx`: revenue trend (with day/month/
year granularity), revenue by category (pie + breakdown), membership status and growth,
outstanding dues (heuristic — see the caveat displayed on the page itself), attendance by
event, project funding, and a CSV export button.

## Known gaps (still true, still honest)
- Mobile: no organization signup (by design — admin-only), no push notifications (needs
  Firebase setup)
- Admin: attendance review UI, payments date-range filter, roles/permissions has no
  bulk-assign UI

## Suggested test checklist for this round
1. Backend: `npm run dev`, confirm no startup errors
2. Admin: sign up a fresh org, verify email (check backend console if no SMTP), log in
3. Admin: invite a member, create a payment category, create an event, create a project
4. Mobile: log in as the invited member, check the Card tab renders correctly
5. Mobile: try editing your profile name/phone, confirm it saves and displays immediately
6. Mobile: try uploading a profile photo
7. Mobile: register for the event created in step 3, confirm the admin dashboard shows the
   registration
8. Mobile: if you have Paystack test keys configured, try paying a category — confirm the
   receipt appears in payment history and the admin Payments page shows it too
