import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface JoinRequest {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  event: { id: string; title: string } | null;
}

export function useJoinRequests(filters: { status?: string } = {}) {
  const qs = filters.status ? `?status=${filters.status}` : "";
  return useQuery({
    queryKey: ["join-requests", filters],
    queryFn: () => api.get<JoinRequest[]>(`/join-requests${qs}`),
  });
}


export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ joinRequestId, roleId }: { joinRequestId: string; roleId: string }) =>
      api.post(`/join-requests/${joinRequestId}/approve`, { roleId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["join-requests"] }),
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (joinRequestId: string) => api.post(`/join-requests/${joinRequestId}/reject`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["join-requests"] }),
  });
}