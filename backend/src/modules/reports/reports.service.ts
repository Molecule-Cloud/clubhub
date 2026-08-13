import { Prisma, prisma } from "../../lib/prisma";
import { getRequestContext } from "../../lib/requestContext";
import { ApiError } from "../../utils/ApiError";

/**
 * IMPORTANT: every function in this file that uses $queryRaw is responsible
 * for its OWN tenant isolation. The Prisma extension in lib/prisma.ts only
 * intercepts structured query methods (findMany, create, etc.) — it does
 * NOT see inside raw SQL. Every raw query below manually includes
 * `"organizationId" = ${orgId}` in its WHERE clause using Prisma's
 * parameterized $queryRaw tagged template (never string interpolation).
 * If you add a new raw query here, this filter is on you to include —
 * nothing will do it automatically.
 */

function requireOrgId(): string {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();
  return ctx.organizationId;
}

/** Postgres SUM()/COUNT() over integer columns return BigInt via the pg
 * driver — convert to Number for JSON serialization. Safe at club-finance
 * scale (amounts are minor-unit integers well under Number.MAX_SAFE_INTEGER
 * even summed across years of transactions). */
function toNumber(value: bigint | number | null): number {
  return value === null ? 0 : Number(value);
}

interface DateRange {
  from?: string;
  to?: string;
}

/** columnRef must be a fully-qualified, pre-quoted column reference like
 * `"paidAt"` or `p."paidAt"` — never build this from user input. */
function dateRangeSql(columnRef: string, range: DateRange): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  if (range.from) conditions.push(Prisma.sql`${Prisma.raw(columnRef)} >= ${new Date(range.from)}`);
  if (range.to) conditions.push(Prisma.sql`${Prisma.raw(columnRef)} <= ${new Date(range.to)}`);
  if (conditions.length === 0) return Prisma.empty;
  return Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`;
}

// ============================================================
// REVENUE
// ============================================================

export async function getRevenueSummary(bucket: "day" | "month" | "year", range: DateRange) {
  const orgId = requireOrgId();

  const rows = await prisma.$queryRaw<{ period: Date; total: bigint; count: bigint }[]>`
    SELECT date_trunc(${bucket}, "paidAt") AS period, SUM(amount) AS total, COUNT(*) AS count
    FROM payments
    WHERE "organizationId" = ${orgId} AND status = 'SUCCESS' AND "paidAt" IS NOT NULL
      ${dateRangeSql('"paidAt"', range)}
    GROUP BY period
    ORDER BY period ASC
  `;

  return rows.map((r) => ({ period: r.period, totalMinorUnits: toNumber(r.total), transactionCount: toNumber(r.count) }));
}

export async function getRevenueByCategory(range: DateRange) {
  const orgId = requireOrgId();

  const rows = await prisma.$queryRaw<{ categoryName: string; categoryType: string; total: bigint; count: bigint }[]>`
    SELECT pc.name AS "categoryName", pc.type AS "categoryType", SUM(p.amount) AS total, COUNT(*) AS count
    FROM payments p
    JOIN payment_categories pc ON pc.id = p."categoryId"
    WHERE p."organizationId" = ${orgId} AND p.status = 'SUCCESS' AND p."paidAt" IS NOT NULL
      ${dateRangeSql('p."paidAt"', range)}
    GROUP BY pc.id, pc.name, pc.type
    ORDER BY total DESC
  `;

  return rows.map((r) => ({
    categoryName: r.categoryName,
    categoryType: r.categoryType,
    totalMinorUnits: toNumber(r.total),
    transactionCount: toNumber(r.count),
  }));
}

/**
 * Heuristic estimate, not an authoritative ledger: flags active members who
 * have no SUCCESS payment against ANY recurring DUES-type category within
 * the given window. ClubHub doesn't currently model a per-member "dues
 * schedule" (e.g. "John owes GHS 50 for March"), so this can't say exactly
 * what's owed — only who's paid nothing in the period. A proper accounts-
 * receivable model (expected charges vs. payments received) would need a
 * dedicated schema addition if precise outstanding-balance tracking becomes
 * a requirement.
 */
export async function getOutstandingDuesEstimate(range: DateRange) {
  const orgId = requireOrgId();
  const from = range.from ? new Date(range.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = range.to ? new Date(range.to) : new Date();

  const rows = await prisma.$queryRaw<{ membershipId: string; firstName: string; lastName: string; email: string }[]>`
    SELECT m.id AS "membershipId", u."firstName", u."lastName", u.email
    FROM memberships m
    JOIN users u ON u.id = m."userId"
    WHERE m."organizationId" = ${orgId} AND m.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM payments p
        JOIN payment_categories pc ON pc.id = p."categoryId"
        WHERE p."membershipId" = m.id AND p.status = 'SUCCESS' AND pc.type = 'DUES'
          AND p."paidAt" >= ${from} AND p."paidAt" <= ${to}
      )
    ORDER BY u."lastName" ASC
  `;

  return { periodFrom: from, periodTo: to, membersWithoutDuesPayment: rows };
}

// ============================================================
// MEMBERSHIP
// ============================================================

export async function getMembershipGrowth(bucket: "day" | "month" | "year", range: DateRange) {
  const orgId = requireOrgId();

  const rows = await prisma.$queryRaw<{ period: Date; newMembers: bigint }[]>`
    SELECT date_trunc(${bucket}, "joinedAt") AS period, COUNT(*) AS "newMembers"
    FROM memberships
    WHERE "organizationId" = ${orgId}
      ${dateRangeSql('"joinedAt"', range)}
    GROUP BY period
    ORDER BY period ASC
  `;

  return rows.map((r) => ({ period: r.period, newMembers: toNumber(r.newMembers) }));
}

export async function getMembershipBreakdown() {
  const orgId = requireOrgId();
  const rows = await prisma.membership.groupBy({
    by: ["status"],
    where: { organizationId: orgId },
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

// ============================================================
// ATTENDANCE
// ============================================================

export async function getAttendanceSummary(eventId: string | undefined, range: DateRange) {
  const orgId = requireOrgId();

  if (eventId) {
    const [registrations, attended] = await Promise.all([
      prisma.eventRegistration.count({ where: { eventId, status: { in: ["REGISTERED", "CONFIRMED", "ATTENDED"] } } }),
      prisma.attendance.count({ where: { eventId } }),
    ]);
    return { eventId, registrations, attended, attendanceRate: registrations > 0 ? attended / registrations : null };
  }

  const rows = await prisma.$queryRaw<{ eventId: string | null; title: string | null; attended: bigint }[]>`
    SELECT a."eventId", e.title, COUNT(*) AS attended
    FROM attendance a
    LEFT JOIN events e ON e.id = a."eventId"
    WHERE a."organizationId" = ${orgId}
      ${dateRangeSql('a."checkedInAt"', range)}
    GROUP BY a."eventId", e.title
    ORDER BY attended DESC
  `;

  return rows.map((r) => ({ eventId: r.eventId, eventTitle: r.title, attended: toNumber(r.attended) }));
}

// ============================================================
// PROJECTS
// ============================================================

export async function getProjectsFundingSummary() {
  const orgId = requireOrgId();
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { id: true, title: true, budget: true, raisedAmount: true, status: true },
  });

  return projects.map((p) => ({
    ...p,
    fundingPercent: p.budget ? Math.min(100, Math.round((p.raisedAmount / p.budget) * 100)) : null,
  }));
}

// ============================================================
// CSV EXPORT
// ============================================================

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportPaymentsCsv(filters: { status?: string; from?: string; to?: string }) {
  const where = {
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
  };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      membership: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
    },
  });

  const header = ["Date", "Member", "Email", "Category", "Amount (GHS)", "Status", "Gateway", "Reference"];
  const lines = payments.map((p) =>
    [
      p.paidAt?.toISOString() ?? p.createdAt.toISOString(),
      `${p.membership.user.firstName} ${p.membership.user.lastName}`,
      p.membership.user.email,
      p.category.name,
      (p.amount / 100).toFixed(2),
      p.status,
      p.gateway,
      p.gatewayRef,
    ]
      .map(csvEscape)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}
