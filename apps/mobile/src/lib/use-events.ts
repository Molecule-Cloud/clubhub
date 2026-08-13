import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";

export interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  ticketPrice: number | null;
  spotsRemaining: number | null;
  myRegistrationStatus: "REGISTERED" | "CONFIRMED" | "CANCELLED" | "ATTENDED" | null;
  _count: { registrations: number };
}

export function useEvents() {
  return useQuery({
    queryKey: ["events", { upcoming: true }],
    queryFn: () => api.get<ClubEvent[]>("/events?upcoming=true"),
    select: (res) => res.data,
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId],
    queryFn: () => api.get<ClubEvent>(`/events/${eventId}`),
    select: (res) => res.data,
    enabled: !!eventId,
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.post(`/events/${eventId}/register`),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
    },
  });
}

export function useCancelRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.delete(`/events/${eventId}/register`),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
    },
  });
}

export function useCheckIn() {
  return useMutation({
    mutationFn: ({ eventId, code }: { eventId: string; code: string }) => api.post(`/events/${eventId}/checkin`, { code }),
  });
}
