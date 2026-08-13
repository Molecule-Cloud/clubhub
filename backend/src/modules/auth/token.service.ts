import jwt from "jsonwebtoken";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { env } from "../../lib/env";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";

export interface AccessTokenPayload {
  userId: string;
  organizationId: string;
  roleId: string;
  membershipId: string;
}

/** Signs a short-lived RS256 access token. Asymmetric signing means any
 * future service can verify tokens with just the public key, without ever
 * holding the private signing key. */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: "RS256",
    // jsonwebtoken's types want a literal union (e.g. "15m") narrower than
    // `string`; env vars are always plain strings, so we assert the shape
    // here rather than losing type-safety on the env schema itself.
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_PUBLIC_KEY, { algorithms: ["RS256"] }) as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issues a brand new refresh token family (used at login). Returns the raw
 * token (sent to the client) — only its hash is persisted.
 */
export async function issueRefreshTokenFamily(userId: string) {
  const rawToken = randomBytes(48).toString("hex");
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(rawToken), familyId, expiresAt },
  });

  return { rawToken, expiresAt };
}

/**
 * Rotates a refresh token: validates the presented token, issues a new one
 * in the same family, and revokes the old one.
 *
 * Theft-detection: if a token that's already been revoked is presented
 * again, that's the signature of a stolen-and-replayed token — the entire
 * family is revoked, forcing re-login on every device sharing that family.
 */
export async function rotateRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  if (existing.revoked) {
    // Reuse of a revoked token — treat as compromise, nuke the whole family.
    await prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId },
      data: { revoked: true },
    });
    throw ApiError.unauthorized("Refresh token reuse detected. Please log in again.");
  }

  if (existing.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token expired");
  }

  const rawNewToken = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } }),
    prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(rawNewToken),
        familyId: existing.familyId,
        expiresAt,
      },
    }),
  ]);

  return { userId: existing.userId, rawNewToken, expiresAt };
}

export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
}
