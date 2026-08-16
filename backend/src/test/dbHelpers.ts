import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { runWithContext } from '../lib/requestContext';
import type { RequestContext } from '../lib/requestContext';

/**
 * Wipes all tenant data between tests. TRUNCATE ... CASCADE on the:
 * "organizations" table removes every row in every table that has
 * a foreign key pointing back to an organization, directly oor
 * transitively, regardlesof each table's own onDelete setting.
 * Postgres's CASCADE option on TRUNCATE is more aggressive than a
 * normal DELETE cascade: it truncates any table that references 
 * the target.
 */

export async function resetDatabase() {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "organizations" RESTART IDENTITY CASCADE;`);
}

/**
 * Creates a minimal. valid organization row directly. No tenant 
 * context needed here - Organization is the root itself, it has no
 * organizationId of its own to be scoped by.
 */

export async function createTestOrganization(
    overrides: Partial<{name: string; slug: string; contactEmail: string; contactPhone: string;}> = {}
) {
    return prisma.organization.create({
        data: {
            name: overrides.name ?? `Test Organization ${randomUUID()}`,
            slug: overrides.slug ?? `test-org-${randomUUID()}`,
            contactEmail: overrides.contactEmail ?? "test@example.com",
            contactPhone: overrides.contactPhone ?? "123-456-7890",
        },
    });
}

/**
 * Runs 'fn' as if it were an authenticated request scoped to the
 * given organization, the exact same mechanism
 * tenantMiddleware uses for real HTTP request, and hat background
 * jobs use per requestContext.ts's own doc comments. This is useful for testing service functions that require
 * a tenant context, without having to go through the HTTP layer.
 */

export function asOrganization<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
    const ctx: RequestContext = {
        organizationId,
        userId: null,
        roleId: null,
        requestId: `test-${randomUUID()}`,
    };
    return runWithContext(ctx, fn);
}
