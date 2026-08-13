import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Member {
  id: string;
  membershipNumber: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ALUMNI";
  joinedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };
  role: { id: string; name: string };
}

export interface Role {
  id: string;
  name: string;
}

interface ListMembersFilters {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

function buildQuery(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useMembers(filters: ListMembersFilters) {
  return useQuery({
    queryKey: ["members", filters],
    queryFn: () => api.get<Member[]>(`/members${buildQuery(filters)}`),
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; roleId: string }) => api.post("/members/invitations", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ membershipId, roleId }: { membershipId: string; roleId: string }) =>
      api.patch(`/members/${membershipId}/role`, { roleId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ membershipId, status }: { membershipId: string; status: Member["status"] }) =>
      api.patch(`/members/${membershipId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => api.delete(`/members/${membershipId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}
