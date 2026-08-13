# ClubHub — Full System Testing Guide

This walks through getting every piece running together — database, backend, admin
dashboard, mobile app — and then verifying real data flows correctly between all four.
Follow it in order; each stage depends on the one before it.

---

## Stage 0 — Prerequisites

Install once, on your machine:

- **Node.js 20+** and npm
- **PostgreSQL** — either installed locally, or a free-tier instance from Neon, Supabase,
  or Railway (anything that gives you a `DATABASE_URL` connection string)
- **OpenSSL** — for generating JWT keys (preinstalled on Mac/Linux; on Windows use Git
  Bash or WSL)
- **Expo Go** app on your phone (from the App Store / Play Store) — the easiest way to run
  the mobile app without setting up a native build environment

Accounts to create (free tiers are fine for testing):

| Service | Required for | 
|---|---|
| **Cloudinary** | Receipts, org logos, user avatars — nothing uploads without it |
| **SMTP provider** (Gmail app password, Mailtrap, Resend, etc.) | Actually receiving OTP emails. Skippable — codes print to the backend terminal if unset |
| **Paystack** (test mode keys) | Testing real payment checkout. Skippable if you're not testing payments yet |

---

## Stage 1 — Database

1. Create an empty Postgres database (locally: `createdb clubhub`, or create one through
   your cloud provider's dashboard).
2. Note the full connection string — you'll need it in Stage 2. It looks like:
   ```
   postgresql://user:password@host:5432/clubhub
   ```

---

## Stage 2 — Backend

```bash
cd backend
npm install
npx prisma generate
```

Generate JWT signing keys:
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Configure environment:
```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Value |
|---|---|
| `DATABASE_URL` | From Stage 1 |
| `JWT_PRIVATE_KEY` | Entire contents of `private.pem`, including `-----BEGIN/END-----` lines |
| `JWT_PUBLIC_KEY` | Entire contents of `public.pem` |
| `CLIENT_URL` | `http://localhost:3000` |
| `ADMIN_URL` | `http://localhost:3000` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | From your Cloudinary dashboard |
| `SMTP_HOST` / `_PORT` / `_USER` / `_PASS` | From your SMTP provider (optional — leave blank to see OTP codes in the terminal instead) |
| `PAYSTACK_SECRET_KEY` / `_PUBLIC_KEY` | From your Paystack dashboard, test mode (optional) |

**Run the migrations** — this creates every table:
```bash
npx prisma migrate dev --name init
```

**Apply Row-Level Security** (a second, separate migration — don't skip this, it's the
database-level security backstop):
```bash
npx prisma migrate dev --create-only --name enable_row_level_security
```
This creates an empty migration file. Open it (in
`backend/prisma/migrations/<timestamp>_enable_row_level_security/migration.sql`) and paste
in the full contents of `backend/prisma/reference/enable_row_level_security.sql`. Then:
```bash
npx prisma migrate dev
```

**Start the server:**
```bash
npm run dev
```

### ✅ Checkpoint 1
You should see `🚀 ClubHub API listening on port 4000` with no errors. Leave this terminal
running for everything else.

Quick sanity check — in a browser or with `curl`, visit `http://localhost:4000/health`.
You should get back `{"status":"ok"}`.

---

## Stage 3 — Admin Dashboard

Open a **new terminal**:
```bash
cd apps/admin
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > .env.local
npm run dev
```

### ✅ Checkpoint 2
Visit **http://localhost:3000** — it should redirect to `/dashboard`, which (correctly)
bounces you to `/login` since you're not signed in yet.

### Create your first organization
1. Go to **http://localhost:3000/signup**
2. Fill in organization details (name, type, contact email) → Continue
3. Fill in your own admin account details → Create organization
4. You'll land on an OTP screen. Check your email — or, if you skipped SMTP, **check the
   backend terminal**, which logs the code there instead.
5. Enter the code → you're redirected to `/login`, pre-filled
6. Sign in

### ✅ Checkpoint 3
You should see the real dashboard — a revenue chart (empty, since there's no data yet)
and a sidebar with Members, Payments, Events, Projects, Announcements, Reports, Settings.

### Seed some test data (needed for mobile testing later)
Working through the sidebar:
1. **Settings → Payment categories** aren't there directly — go to **Payments → Manage
   categories** and create one, e.g. "Monthly Dues", type `DUES`, default amount `50.00`
2. **Events** → create an event a few days in the future, with a location and capacity
3. **Projects** → create a project with a budget, so you can see funding progress later
4. **Members → Invite member** — invite a *second* email address you control (this will
   become your mobile app test account). Check that email (or the backend terminal again)
   for the invite link.
5. Open the invite link — it takes you to `/join/<org-slug>?token=...` in the admin app,
   where you'll set a name, phone (optional), and password to finish creating that second
   account.

### ✅ Checkpoint 4
You have: an organization, a payment category, an event, a project, and a second member
account ready to test the mobile app with.

---

## Stage 4 — Mobile App

Open a **third terminal**:
```bash
cd apps/mobile
npm install
```

**Critical step**: open `app.json` and find `expo.extra.apiUrl`. Change it from
`localhost` to your computer's **local network IP address** — a phone can't resolve
`localhost` as "this computer."

Find your IP:
- Mac/Linux: `ifconfig | grep "inet "`
- Windows: `ipconfig` → look for "IPv4 Address"

It'll look like `192.168.1.42`. Update the config:
```json
"extra": {
  "apiUrl": "http://192.168.1.42:4000/api/v1"
}
```

Make sure your phone and computer are on **the same Wi-Fi network**.

```bash
npx expo start
```

### ✅ Checkpoint 5
A QR code appears in the terminal. Scan it with your phone's camera (iOS) or the Expo Go
app directly (Android) — the app should open and land on the login screen.

### Sign in and verify each feature

1. **Login** — use the second member account from Stage 3 (organization slug, email,
   password from when they accepted the invite)
2. **My Card tab** — should show a digital membership card with a QR code and, if you set
   a logo/brand color in Settings, that branding reflected in the card's header
3. **Payments tab**:
   - You should see the category you created ("Monthly Dues")
   - Tap it, enter an amount, tap "Pay with Paystack" — a browser should open to Paystack
     checkout (only works if you configured `PAYSTACK_SECRET_KEY`; otherwise you'll get an
     error here, which is expected)
   - If you completed a test payment, it should appear in payment history below with a
     "SUCCESS" badge and a receipt download icon
4. **Events tab**:
   - The event you created should appear
   - Tap it → Register → the button should switch to a green "You're registered" state
   - Go back to the admin dashboard's Events page and confirm the registration count went
     up
5. **Profile tab**:
   - Tap "Edit profile", change your name, save — it should update immediately
   - Tap your avatar circle, pick a photo from your library — it should upload and display

### ✅ Checkpoint 6
Every tab shows real data that traces back to something you created in the admin
dashboard. This confirms the full loop: **admin creates data → backend stores it → mobile
reads and acts on it → backend updates → admin reflects the update.**

---

## Stage 5 — Confirm the full loop, both directions

To be sure data flows both ways, not just admin-to-mobile:

1. On mobile, register for an event.
2. On admin (Events page → your event), confirm the registration count increased.
3. On admin (Payments page), manually record a cash payment for your test member.
4. On mobile (Payments tab), pull to refresh — the manually-recorded payment should appear
   in history.
5. On admin (Settings), change the organization's brand color.
6. On mobile (Card tab), pull to refresh — the membership card's header color should
   update.

If all six of these work, the system is functioning end-to-end.

---

## Troubleshooting

**"relation does not exist" during migration** — your migrations ran out of order. See the
Backend setup section in the main README; this is almost always fixed by deleting a
stale/misordered migration folder and letting `prisma migrate dev` regenerate one with a
correct timestamp.

**Mobile app can't reach the backend / requests hang** — almost always the `apiUrl` in
`app.json` still says `localhost`, or your phone and computer aren't on the same network.
Double-check both.

**OTP codes never arrive** — either SMTP isn't configured (check the backend terminal
instead — codes log there) or check spam folder if it is configured.

**"Payment gateway is not configured" error** — `PAYSTACK_SECRET_KEY` isn't set. Expected
if you skipped that optional setup step; everything else still works without it.

**Admin dashboard shows a blank/error page after login** — check the backend terminal for
errors; also confirm `NEXT_PUBLIC_API_URL` in `apps/admin/.env.local` matches where your
backend is actually running.

**Logo/avatar upload fails silently** — Cloudinary env vars aren't set correctly. Check the
backend terminal for a Cloudinary-related error.
