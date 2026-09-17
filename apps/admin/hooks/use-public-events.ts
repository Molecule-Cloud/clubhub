import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  ticketPrice: number | null;
  organization: { id: string; name: string; slug: string; logoUrl: string | null };
}

export function usePublicEvents() {
  return useQuery({
    queryKey: ["public-events"],
    queryFn: () => api.get<PublicEvent[]>("/public/events", { skipAuth: true }),
  });
}

export function usePublicEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["public-events", eventId],
    queryFn: () => api.get<PublicEvent>(`/public/events/${eventId}`, { skipAuth: true }),
    enabled: !!eventId,
  });
}

export function useCreateJoinRequest() {
  return useMutation({
    mutationFn: ({ slug, ...input }: {
      slug: string;
      eventId?: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      message?: string;
    }) => api.post(`/public/organizations/${slug}/join-requests`, input, { skipAuth: true }),
  });
}