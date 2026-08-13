import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { env } from "../../lib/env";
import { ApiError } from "../../utils/ApiError";
import { uploadBuffer } from "../../lib/cloudinary";
import { DEFAULT_ROLE_TEMPLATES, PERMISSIONS } from "../../constants/permissions";
import { issueOtp, verifyOtp } from "./otp.service";
import { issueRefreshTokenFamily, rotateRefreshToken, revokeRefreshToken, signAccessToken } from "./token.service";
import type { LoginInput, RegisterOrganizationInput } from "./auth.validation";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let suffix = 1;
  // Small collision-retry loop — fine at this scale; org creation is a rare,
  // low-throughput operation, not a hot path needing a smarter allocator.
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

/**
 * Organization onboarding: creates the Organization, seeds the platform's
 * default permission catalog (idempotently) and default roles, and creates
 * the founding admin User + Membership — all in one transaction so we never
 * end up with a half-created organization if something fails midway.
 *
 * Runs OUTSIDE any tenant context (organizationId doesn't exist yet), so the
 * tenant-scoping Prisma extension correctly no-ops here (see lib/prisma.ts).
 */
export async function registerOrganization(input: RegisterOrganizationInput) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.admin.email } });
  if (existingUser) {
    throw ApiError.conflict("An account with this email already exists.");
  }

  const slug = await generateUniqueSlug(input.organization.name);
  const passwordHash = await bcrypt.hash(input.admin.password, env.BCRYPT_SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Ensure the global permission catalog exists (idempotent upsert —
    //    safe to run even though in steady-state this is a no-op after the
    //    very first organization ever created on the platform).
    for (const permission of PERMISSIONS) {
      await tx.permission.upsert({
        where: { key: permission.key },
        create: permission,
        update: {},
      });
    }
    const allPermissions = await tx.permission.findMany();
    const permissionsByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

    // 2. Create the organization.
    const organization = await tx.organization.create({
      data: {
        name: input.organization.name,
        slug,
        type: input.organization.type,
        contactEmail: input.organization.contactEmail,
        contactPhone: input.organization.contactPhone,
      },
    });

    // 3. Seed default roles + their permission grants for this organization.
    const roleIdByName = new Map<string, string>();
    for (const template of DEFAULT_ROLE_TEMPLATES) {
      const role = await tx.role.create({
        data: { organizationId: organization.id, name: template.name, isDefault: true },
      });
      roleIdByName.set(template.name, role.id);

      for (const permKey of template.permissions) {
        const permissionId = permissionsByKey.get(permKey);
        if (permissionId) {
          await tx.rolePermission.create({ data: { roleId: role.id, permissionId } });
        }
      }
    }

    // 4. Create the founding admin user, assigned the "President" role.
    const adminUser = await tx.user.create({
      data: {
        email: input.admin.email,
        phone: input.admin.phone,
        passwordHash,
        firstName: input.admin.firstName,
        lastName: input.admin.lastName,
      },
    });

    const presidentRoleId = roleIdByName.get("President")!;
    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: adminUser.id,
        roleId: presidentRoleId,
        membershipNumber: `${slug.slice(0, 8).toUpperCase()}-00001`,
      },
    });

    return { organization, adminUser };
  });

  await issueOtp(result.adminUser.id, result.adminUser.email, "EMAIL_VERIFICATION");

  return {
    organizationId: result.organization.id,
    organizationSlug: result.organization.slug,
    userId: result.adminUser.id,
    message: "Organization created. Check your email for a verification code.",
  };
}

export async function confirmEmailVerification(userId: string, code: string) {
  await verifyOtp(userId, code, "EMAIL_VERIFICATION");
  await prisma.user.update({ where: { id: userId }, data: { isEmailVerified: true } });
}

/**
 * Resends an OTP for a given purpose. Deliberately does not reveal whether
 * the userId exists — same pattern as requestPasswordReset — since this
 * endpoint runs pre-auth (the signup wizard's OTP step) and userId is
 * technically guessable (cuid, not secret), unlike an email-based lookup.
 * A no-op response either way avoids using this as an oracle to enumerate
 * valid user IDs.
 */
export async function resendOtp(userId: string, purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN_2FA") {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await issueOtp(user.id, user.email, purpose);
  }
  return { message: "If the account exists, a new code has been sent." };
}

/**
 * Login requires organizationSlug because a User can hold Memberships in
 * multiple organizations — we need to know which one to issue a token for,
 * since the access token embeds a single organizationId + roleId.
 */
export async function login(input: LoginInput) {
  const organization = await prisma.organization.findUnique({ where: { slug: input.organizationSlug } });
  if (!organization || !organization.isActive) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  if (!user.isEmailVerified) {
    throw ApiError.forbidden("Please verify your email before logging in.");
  }

  const membership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw ApiError.forbidden("You do not have active access to this organization.");
  }

  const accessToken = signAccessToken({
    userId: user.id,
    organizationId: organization.id,
    roleId: membership.roleId,
    membershipId: membership.id,
  });
  const { rawToken: refreshToken, expiresAt: refreshExpiresAt } = await issueRefreshTokenFamily(user.id);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logoUrl,
      primaryColor: organization.primaryColor,
    },
  };
}

export async function refresh(rawRefreshToken: string) {
  const { userId, rawNewToken, expiresAt } = await rotateRefreshToken(rawRefreshToken);

  // Re-derive the access token payload fresh from the DB rather than trusting
  // any client-supplied org/role — the refresh flow only carries userId, so
  // we need to know which membership this refresh session is for. Since a
  // refresh token isn't org-scoped in this design, callers must re-select
  // the organization on the client if the user belongs to more than one;
  // for a single-org user we pick their sole active membership automatically.
  const memberships = await prisma.membership.findMany({ where: { userId, status: "ACTIVE" } });
  if (memberships.length === 0) {
    throw ApiError.forbidden("No active organization membership found.");
  }
  if (memberships.length > 1) {
    throw ApiError.badRequest(
      "Multiple active organizations found. Please log in again and select an organization."
    );
  }

  const membership = memberships[0]!;
  const accessToken = signAccessToken({
    userId,
    organizationId: membership.organizationId,
    roleId: membership.roleId,
    membershipId: membership.id,
  });

  return { accessToken, refreshToken: rawNewToken, refreshExpiresAt: expiresAt };
}

export async function logout(rawRefreshToken: string) {
  await revokeRefreshToken(rawRefreshToken);
}

/** Backs GET /auth/me — used by frontend clients to repopulate user/org
 * state after a silent token refresh on page load (the refresh endpoint
 * itself only returns a new access token, not identity). */
export async function getCurrentUser(userId: string, organizationId: string) {
  const [user, membership] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
    }),
    prisma.membership.findFirstOrThrow({
      where: { userId, organizationId },
      include: { role: { select: { id: true, name: true } }, organization: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } } },
    }),
  ]);

  return {
    user,
    membership: { id: membership.id, membershipNumber: membership.membershipNumber, role: membership.role },
    organization: membership.organization,
  };
}

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

/**
 * Updates the caller's own profile fields — deliberately NOT membership,
 * role, or organization data, which have their own dedicated (and
 * permission-gated) update paths. A member can always edit their own
 * name/phone; they can never grant themselves a different role through
 * this endpoint no matter what fields are included in the request body,
 * since this function only ever touches the User table.
 */
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.phone) {
    const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing && existing.id !== userId) {
      throw ApiError.conflict("This phone number is already in use by another account.");
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
  });
}

export async function updateAvatar(userId: string, fileBuffer: Buffer) {
  const avatarUrl = await uploadBuffer(fileBuffer, {
    folder: `clubhub/users/${userId}`,
    publicId: "avatar",
    resourceType: "image",
    overwrite: true, // like an org logo, an avatar is meant to be replaced, not versioned
  });

  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Deliberately do not reveal whether the email exists — same response
  // either way, to avoid leaking which emails are registered on the platform.
  if (user) {
    await issueOtp(user.id, user.email, "PASSWORD_RESET");
  }
  return { message: "If an account exists for this email, a reset code has been sent." };
}

export async function resetPassword(userId: string, code: string, newPassword: string) {
  await verifyOtp(userId, code, "PASSWORD_RESET");
  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  // Revoke all existing refresh tokens for this user — a password reset
  // should invalidate every currently logged-in session.
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
}
