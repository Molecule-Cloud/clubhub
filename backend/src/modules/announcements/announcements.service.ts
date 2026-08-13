import { prisma } from "../../lib/prisma";
import { getRequestContext } from "../../lib/requestContext";
import { ApiError } from "../../utils/ApiError";
import { sendEmail } from "../../lib/mailer";
import { sendPushNotification } from "../../lib/push";
import { logger } from "../../lib/logger";

interface CreateAnnouncementInput {
  title: string;
  body: string;
  sendEmail: boolean;
  sendPush: boolean;
}

/**
 * Creates an announcement and fans it out to every active member of the
 * organization. Fan-out is synchronous here — fine at club-membership scale
 * (tens to low hundreds of recipients per send). If ClubHub ever serves an
 * organization large enough for this loop to approach the request timeout,
 * this is the point to move the fan-out into src/jobs/ as a background job
 * queued off this create call, rather than rewriting the send logic itself.
 */
export async function createAnnouncement(input: CreateAnnouncementInput) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });

  const recipients = await prisma.membership.findMany({
    where: { status: "ACTIVE" },
    include: { user: { select: { email: true } } },
  });

  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      sentEmail: false,
      sentPush: false,
    } as never, // organizationId injected by the tenant-scoping extension on create
  });

  let emailSent = false;
  if (input.sendEmail) {
    const results = await Promise.allSettled(
      recipients.map((r: (typeof recipients)[number]) =>
        sendEmail({
          to: r.user.email,
          subject: `[${organization.name}] ${input.title}`,
          html: `<h2>${input.title}</h2><p>${input.body}</p>`,
        })
      )
    );
    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      logger.warn({ announcementId: announcement.id, failures, total: recipients.length }, "Some announcement emails failed to send");
    }
    emailSent = true;
  }

  let pushSent = false;
  if (input.sendPush) {
    pushSent = await sendPushNotification({
      organizationId: ctx.organizationId,
      title: input.title,
      body: input.body,
    });
  }

  return prisma.announcement.update({
    where: { id: announcement.id },
    data: { sentEmail: emailSent, sentPush: pushSent },
  });
}

export async function listAnnouncements(page: number, pageSize: number) {
  const [total, announcements] = await Promise.all([
    prisma.announcement.count(),
    prisma.announcement.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { announcements, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function getAnnouncement(announcementId: string) {
  const announcement = await prisma.announcement.findFirst({ where: { id: announcementId } });
  if (!announcement) throw ApiError.notFound("Announcement not found.");
  return announcement;
}
