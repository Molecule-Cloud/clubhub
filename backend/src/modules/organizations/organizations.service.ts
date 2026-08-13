import { prisma } from "../../lib/prisma";
import { getRequestContext } from "../../lib/requestContext";
import { ApiError } from "../../utils/ApiError";
import { uploadBuffer } from "../../lib/cloudinary";
import { writeAuditLog } from "../../lib/auditLog";

export async function getCurrentOrganization() {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  return prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
}

interface UpdateOrganizationInput {
  name?: string;
  contactEmail?: string;
  contactPhone?: string | null;
  address?: string | null;
  primaryColor?: string | null;
}

export async function updateOrganization(input: UpdateOrganizationInput) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const before = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });

  const updated = await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: input,
  });

  await writeAuditLog({
    action: "organization.settings_updated",
    entityType: "Organization",
    entityId: ctx.organizationId,
    before: { name: before.name, contactEmail: before.contactEmail, primaryColor: before.primaryColor },
    after: { name: updated.name, contactEmail: updated.contactEmail, primaryColor: updated.primaryColor },
  });

  return updated;
}

export async function updateLogo(fileBuffer: Buffer) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });

  const logoUrl = await uploadBuffer(fileBuffer, {
    folder: `clubhub/${organization.slug}/branding`,
    publicId: "logo",
    resourceType: "image",
    overwrite: true, // unlike receipts, a logo is meant to be replaced when rebranded
  });

  return prisma.organization.update({ where: { id: ctx.organizationId }, data: { logoUrl } });
}
