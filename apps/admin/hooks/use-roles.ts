import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Permission {
  key: string;
  description: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  isDefault: boolean;
  _count: { memberships: number };
  rolePermissions: { permission: Permission }[];
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles", "detailed"],
    queryFn: () => api.get<RoleWithPermissions[]>("/members/roles"),
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => api.get<Permission[]>("/members/permissions"),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; permissions: string[] }) => api.post("/members/roles", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useRenameRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, name }: { roleId: string; name: string }) => api.patch(`/members/roles/${roleId}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useSetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      api.put(`/members/roles/${roleId}/permissions`, { permissions }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => api.delete(`/members/roles/${roleId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}
