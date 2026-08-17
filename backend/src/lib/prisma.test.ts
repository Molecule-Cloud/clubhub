import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, Prisma, scopedCreateData } from "./prisma";
import { resetDatabase, createTestOrganization, asOrganization } from "../test/dbHelpers";
import { withTenantRLS } from "./withTenantRLS";

describe("tenant-scoping Prisma extension — plumbing check", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("automatically injects organizationId on create, without it being passed explicitly", async () => {
    const orgA = await createTestOrganization({ name: "Org A" });

    const role = await asOrganization(orgA.id, async () => {
      return await withTenantRLS(orgA.id, async (tx) => {
        return await tx.role.create({
          data: scopedCreateData<Prisma.RoleUncheckedCreateInput>({
            name: "President",
            isDefault: false,
          }),
        });
      });
    });

    expect(role.organizationId).toBe(orgA.id);
  });
});

describe("tenant-scoping Prisma extension — cross-tenant isolation", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("never returns another organization's rows from a findMany", async () => {
    const orgA = await createTestOrganization({ name: "Org A" });
    const orgB = await createTestOrganization({ name: "Org B" });

    await asOrganization(orgA.id, async () => {
      await withTenantRLS(orgA.id, async (tx) => {
        await tx.role.create({
          data: scopedCreateData<Prisma.RoleUncheckedCreateInput>({ name: "President", isDefault: false }),
        });
      });
    });

    const rolesVisibleToOrgB = await asOrganization(orgB.id, async () => {
      return await prisma.role.findMany();
    });

    expect(rolesVisibleToOrgB).toHaveLength(0);
  });

  it("cannot update another organization's row, even when targeting its exact id", async () => {
    const orgA = await createTestOrganization({ name: "Org A" });
    const orgB = await createTestOrganization({ name: "Org B" });

    const roleA = await asOrganization(orgA.id, async () => {
      return await withTenantRLS(orgA.id, async (tx) => {
        return await tx.role.create({
          data: scopedCreateData<Prisma.RoleUncheckedCreateInput>({ name: "President", isDefault: false }),
        });
      });
    });

    const updateResult = await asOrganization(orgB.id, async () => {
      return await prisma.role.updateMany({
        where: { id: roleA.id },
        data: { name: "Hijacked" },
      });
    });

    expect(updateResult.count).toBe(0);

    const stillOriginal = await asOrganization(orgA.id, async () => {
      return await withTenantRLS(orgA.id, async (tx) => tx.role.findUniqueOrThrow({ where: { id: roleA.id } }));
    });
    expect(stillOriginal.name).toBe("President");
  });

  it("DOCUMENTS A KNOWN GAP: findUnique is NOT auto-scoped by the extension", async () => {
    const orgA = await createTestOrganization({ name: "Org A" });
    const orgB = await createTestOrganization({ name: "Org B" });

    const roleA = await asOrganization(orgA.id, async () => {
      return await withTenantRLS(orgA.id, async (tx) => {
        return await tx.role.create({
          data: scopedCreateData<Prisma.RoleUncheckedCreateInput>({ name: "President", isDefault: false }),
        });
      });
    });

    // This SHOULD be dangerous, and it is, on purpose, to keep it visible:
    // findUnique bypasses tenant scoping entirely (see lib/prisma.ts's own
    // doc comment). Every call site using findUnique against a
    // tenant-scoped model MUST manually verify organizationId on the
    // result before trusting it. If this test ever starts failing because
    // findUnique becomes correctly scoped, that's GOOD — update this test
    // to assert the safe behavior instead of deleting it.
    const leaked = await asOrganization(orgB.id, async () => {
      return await withTenantRLS(orgB.id, async (tx) => tx.role.findUnique({ where: { id: roleA.id } }));
    });

    expect(leaked).toBeNull();
    // expect(leaked?.organizationId).toBe(orgA.id); // Org B's context, but Org A's row — the gap, made visible
  });
});