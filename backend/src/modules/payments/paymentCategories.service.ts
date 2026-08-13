import { prisma } from "../../lib/prisma";
import { getRequestContext } from "../../lib/requestContext";
import { ApiError } from "../../utils/ApiError";

interface CreateCategoryInput {
  name: string;
  type: "DUES" | "DONATION" | "PROJECT_CONTRIBUTION" | "FUNDRAISING" | "EVENT_FEE" | "LEVY" | "CUSTOM";
  isRecurring: boolean;
  defaultAmount?: number;
}

export async function createCategory(input: CreateCategoryInput) {
  const ctx = getRequestContext();
  // organizationId is also injected automatically by the tenant-scoping
  // Prisma extension on every `create` — passed explicitly here too so this
  // call stays correctly-typed and correct even if the extension were ever
  // bypassed (e.g. a raw basePrisma call).
  return prisma.paymentCategory.create({
    data: {
      organizationId: ctx.organizationId!,
      name: input.name,
      type: input.type,
      isRecurring: input.isRecurring,
      defaultAmount: input.defaultAmount,
    },
  });
}

export async function listCategories(activeOnly = true) {
  return prisma.paymentCategory.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { createdAt: "asc" },
  });
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<{ name: string; isRecurring: boolean; defaultAmount: number | null; isActive: boolean }>
) {
  const existing = await prisma.paymentCategory.findFirst({ where: { id: categoryId } });
  if (!existing) throw ApiError.notFound("Payment category not found.");

  return prisma.paymentCategory.update({ where: { id: categoryId }, data: updates });
}
