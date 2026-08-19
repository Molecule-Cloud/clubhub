import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  ticketPrice: number | null;
  spotsRemaining?: number | null;
  _count: { registrations: number; attendance?: number };
}

export interface EventRegistration {
  status: string;
  membership: { user: { firstName: string; lastName: string; email: string } };
}

export interface AttendanceRecord {
  id: string;
  checkedInAt: string;
  method: string;
  membership: { user: { firstName: string; lastName: string } };
}

interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
  ticketPrice?: number;
}

export function useEvents(filters: { upcoming?: boolean } = {}) {
  const qs = filters.upcoming ? "?upcoming=true" : "";
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => api.get<ClubEvent[]>(`/events${qs}`),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => api.post("/events", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({eventId, input} : { eventId: string; input: Partial<CreateEventInput> }) => api.put(`/events/${eventId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] })
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.delete(`/events/${eventId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useCheckinQrCode(eventId: string | null) {
  return useQuery({
    queryKey: ["events", eventId, "checkin-qr"],
    queryFn: () => api.get<{ qrCodeDataUrl: string }>(`/events/${eventId}/checkin-qr`),
    enabled: !!eventId,
  });
}

export function useEventRegistrations(eventId: string | null) {
  return useQuery({
    queryKey: ["events", eventId, "registrations"],
    queryFn: () => api.get<EventRegistration[]>(`/events/${eventId}/registrations`),
    enabled: !!eventId,
  });
}

/** Not yet wired into a component this chunk — the event detail dialog
 * currently shows registrations only. Available for when attendance
 * tracking gets its own UI surface (post-event "who actually showed up"
 * view is a natural follow-up, distinct from the pre-event RSVP list). */
export function useEventAttendance(eventId: string | null) {
  return useQuery({
    queryKey: ["events", eventId, "attendance"],
    queryFn: () => api.get<AttendanceRecord[]>(`/events/${eventId}/attendance`),
    enabled: !!eventId,
  });
}

/** Also not yet wired in — staff-assisted check-in needs a member picker
 * UI (search/select a member to check in on their behalf), which is more
 * than this chunk's scope. The backend endpoint is ready when that lands. */
export function useStaffCheckIn(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => api.post(`/events/${eventId}/checkin/${membershipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "registrations"] });
    },
  });
}
