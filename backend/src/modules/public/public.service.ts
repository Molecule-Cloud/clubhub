import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";

// Deliberately hand-picked field selection, not `include: true`,  this
// data is served to anonymous internet traffic. Never add a field here
// without checking it's safe for a stranger to see (no qrCheckinCode,
// no capacity/registration internals, no organization contact details).
// 
const PUBLIC_EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  location: true,
  startsAt: true,
  endsAt: true,
  ticketPrice: true,
  organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
} as const;

interface ListPublicEventsFilters {
  page: number;
  pageSize: number;
}

export async function listPublicEvents(filters: ListPublicEventsFilters) {
  const where = { isPublic: true, startsAt: { gte: new Date() } };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      select: PUBLIC_EVENT_SELECT,
      orderBy: { startsAt: "asc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  return {
    events,
    pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) },
  };
}

export async function getPublicEvent(eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, isPublic: true },
    select: PUBLIC_EVENT_SELECT,
  });
  if (!event) throw ApiError.notFound("Event not found.");
  return event;
}