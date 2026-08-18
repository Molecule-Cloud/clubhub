import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { prisma, Prisma, scopedCreateData } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";
import { getRequestContext } from "../../lib/requestContext";

interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
  ticketPrice?: number;
}

export async function createEvent(input: CreateEventInput) {
  return prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      location: input.location,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      capacity: input.capacity,
      ticketPrice: input.ticketPrice,
      qrCheckinCode: randomBytes(8).toString("hex"),
    } as never, // organizationId injected by the tenant-scoping extension on create
  });
}

interface ListEventsFilters {
  upcoming?: boolean;
  page: number;
  pageSize: number;
}

export async function listEvents(filters: ListEventsFilters) {
  const ctx = getRequestContext();
  const where = filters.upcoming ? { startsAt: { gte: new Date() } } : {};

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { registrations: true } } },
    }),
  ]);

  // One extra query for the caller's own registrations across every event
  // on this page, rather than N+1 queries (one per event) — the whole
  // point of batching is to answer "am I registered for each of these"
  // without O(n) round trips.
  const myRegistrationsByEventId = await getMyRegistrationStatusMap(
    ctx.userId,
    events.map((e) => e.id)
  );

  return {
    events: events.map((e) => ({ ...e, myRegistrationStatus: myRegistrationsByEventId.get(e.id) ?? null })),
    pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) },
  };
}

/** Resolves the caller's own EventRegistration.status for each of the given
 * event IDs, in one query. Returns an empty map (not an error) for
 * unauthenticated-ish edge cases or callers with no membership, so this is
 * always safe to call from a member-authenticated route. */
async function getMyRegistrationStatusMap(userId: string | null, eventIds: string[]): Promise<Map<string, string>> {
  if (!userId || eventIds.length === 0) return new Map();

  const membership = await prisma.membership.findFirst({ where: { userId } });
  if (!membership) return new Map();

  const registrations = await prisma.eventRegistration.findMany({
    where: { membershipId: membership.id, eventId: { in: eventIds } },
    select: { eventId: true, status: true },
  });

  return new Map(registrations.map((r) => [r.eventId, r.status]));
}

export async function getEvent(eventId: string) {
  const ctx = getRequestContext();
  const event = await prisma.event.findFirst({
    where: { id: eventId },
    include: { _count: { select: { registrations: true, attendance: true } } },
  });
  if (!event) throw ApiError.notFound("Event not found.");

  const spotsRemaining = event.capacity ? Math.max(0, event.capacity - event._count.registrations) : null;
  const myRegistrationsByEventId = await getMyRegistrationStatusMap(ctx.userId, [eventId]);

  return { ...event, spotsRemaining, myRegistrationStatus: myRegistrationsByEventId.get(eventId) ?? null };
}

export async function updateEvent(
  eventId: string,
  updates: Partial<{
    title: string;
    description: string | null;
    location: string | null;
    startsAt: string;
    endsAt: string | null;
    capacity: number | null;
    ticketPrice: number | null;
  }>
) {
  const existing = await prisma.event.findFirst({ where: { id: eventId } });
  if (!existing) throw ApiError.notFound("Event not found.");

  return prisma.event.update({
    where: { id: eventId },
    data: {
      ...updates,
      startsAt: updates.startsAt !== undefined ? new Date(updates.startsAt) : undefined,
      endsAt: updates.endsAt !== undefined ? (updates.endsAt ? new Date(updates.endsAt) : null) : undefined,
    },
  });
}

export async function deleteEvent(eventId: string) {
  const existing = await prisma.event.findFirst({ where: { id: eventId } });
  if (!existing) throw ApiError.notFound("Event not found.");
  await prisma.event.delete({ where: { id: eventId } });
}

/** Returns a QR code (as a data URL) that encodes {eventId, code} — meant
 * to be displayed/printed at the venue for members to scan and self-check-in. */
export async function getCheckinQrCode(eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId } });
  if (!event) throw ApiError.notFound("Event not found.");

  const payload = JSON.stringify({ eventId: event.id, code: event.qrCheckinCode });
  const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
  return { qrCodeDataUrl: dataUrl };
}

/**
 * Member self-registers (RSVP) for an event. Re-registration after a prior
 * cancellation reactivates the existing row rather than violating the
 * unique(eventId, membershipId) constraint with a fresh insert.
 */
export async function registerForEvent(eventId: string) {
  const ctx = getRequestContext();
  if (!ctx.userId) throw ApiError.forbidden();

  const event = await prisma.event.findFirst({ where: { id: eventId } });
  if (!event) throw ApiError.notFound("Event not found.");

  const membership = await prisma.membership.findFirst({ where: { userId: ctx.userId } });
  if (!membership) throw ApiError.forbidden("No active membership found.");

  if (event.capacity) {
    const registeredCount = await prisma.eventRegistration.count({
      where: { eventId, status: { in: ["REGISTERED", "CONFIRMED", "ATTENDED"] } },
    });
    if (registeredCount >= event.capacity) {
      throw ApiError.conflict("This event is at full capacity.");
    }
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_membershipId: { eventId, membershipId: membership.id } },
  });

  if (existing) {
    if (existing.status === "CANCELLED") {
      return prisma.eventRegistration.update({ where: { id: existing.id }, data: { status: "REGISTERED" } });
    }
    throw ApiError.conflict("You are already registered for this event.");
  }

  return prisma.eventRegistration.create({ 
    data: ({ 
      eventId, 
      membershipId: membership.id,
      // method: "MANUAL", 
  }),
  });
}

export async function cancelRegistration(eventId: string) {
  const ctx = getRequestContext();
  if (!ctx.userId) throw ApiError.forbidden();

  const membership = await prisma.membership.findFirst({ where: { userId: ctx.userId } });
  if (!membership) throw ApiError.forbidden("No active membership found.");

  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_membershipId: { eventId, membershipId: membership.id } },
  });
  if (!registration) throw ApiError.notFound("You are not registered for this event.");

  await prisma.eventRegistration.update({ where: { id: registration.id }, data: { status: "CANCELLED" } });
}

export async function listRegistrations(eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId } });
  if (!event) throw ApiError.notFound("Event not found.");

  return prisma.eventRegistration.findMany({
    where: { eventId },
    include: { membership: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Self-service check-in: the member scans the venue's posted QR code (which
 * encodes the event's qrCheckinCode) and submits it here. Validates the
 * code matches, then records Attendance for the CALLER's own membership —
 * a member cannot check anyone else in through this endpoint.
 */
export async function selfCheckIn(eventId: string, submittedCode: string) {
  const ctx = getRequestContext();
  if (!ctx.userId) throw ApiError.forbidden();

  const event = await prisma.event.findFirst({ where: { id: eventId } });
  if (!event) throw ApiError.notFound("Event not found.");
  if (event.qrCheckinCode !== submittedCode) throw ApiError.badRequest("Invalid check-in code.");

  const membership = await prisma.membership.findFirst({ where: { userId: ctx.userId } });
  if (!membership) throw ApiError.forbidden("No active membership found.");

  const existing = await prisma.attendance.findFirst({ where: { eventId, membershipId: membership.id } });
  if (existing) throw ApiError.conflict("You have already checked in to this event.");

  const [attendance] = await prisma.$transaction([
    prisma.attendance.create({ 
      data: scopedCreateData<Prisma.AttendanceUncheckedCreateInput>({
        eventId,
        membershipId: membership.id,
        method: "QR_CODE"
      })
    }),
    prisma.eventRegistration.updateMany({
      where: { eventId, membershipId: membership.id },
      data: { status: "ATTENDED" },
    }),
  ]);

  return attendance;
}

/** Staff-assisted check-in — for members without the app, or a scanning
 * issue at the door. Requires attendance:manage (enforced at the route). */
export async function staffCheckIn(eventId: string, membershipId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId } });
  if (!event) throw ApiError.notFound("Event not found.");

  const membership = await prisma.membership.findFirst({ where: { id: membershipId } });
  if (!membership) throw ApiError.notFound("Member not found in this organization.");

  const existing = await prisma.attendance.findFirst({ where: { eventId, membershipId } });
  if (existing) throw ApiError.conflict("This member has already checked in to this event.");

  const [attendance] = await prisma.$transaction([
    prisma.attendance.create({ data: scopedCreateData<Prisma.AttendanceUncheckedCreateInput>({ 
      eventId, 
      membershipId, 
      method: "MANUAL" 
    }) 
  }),
    prisma.eventRegistration.updateMany({ where: { eventId, membershipId }, data: { status: "ATTENDED" } }),
  ]);

  return attendance;
}

export async function listAttendance(eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId } });
  if (!event) throw ApiError.notFound("Event not found.");

  return prisma.attendance.findMany({
    where: { eventId },
    include: { membership: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { checkedInAt: "asc" },
  });
}

/** General (non-event) attendance — e.g. a regular weekly club meeting
 * that isn't modeled as an Event. Always staff-recorded. */
export async function recordGeneralAttendance(membershipId: string, eventId?: string) {
  const membership = await prisma.membership.findFirst({ where: { id: membershipId } });
  if (!membership) throw ApiError.notFound("Member not found in this organization.");

  if (eventId) {
    const event = await prisma.event.findFirst({ where: { id: eventId } });
    if (!event) throw ApiError.notFound("Event not found in this organization.");
  }

  return prisma.attendance.create({ data: scopedCreateData<Prisma.AttendanceUncheckedCreateInput>({ membershipId, eventId, method: "MANUAL" }) });
}

// function scopedCreateData<T extends Partial<Record<string, any>>>(args: { membershipId: string; eventId?: string | null; method: string }) {
//   const { membershipId, eventId, method } = args;
//   // include eventId only when provided to satisfy strict typing
//   const data: any = { membershipId, method };
//   if (eventId) data.eventId = eventId;
//   return data as T;
// }

