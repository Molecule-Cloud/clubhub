import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  sentEmail: boolean;
  sentPush: boolean;
  createdAt: string;
}

interface CreateAnnouncementInput {
  title: string;
  body: string;
  sendEmail: boolean;
  sendPush: boolean;
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get<Announcement[]>("/announcements"),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => api.post("/announcements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
