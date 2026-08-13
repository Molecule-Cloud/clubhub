import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  logoUrl: string | null;
  primaryColor: string | null;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

interface UpdateOrganizationInput {
  name?: string;
  contactEmail?: string;
  contactPhone?: string | null;
  address?: string | null;
  primaryColor?: string | null;
}

export function useOrganization() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: () => api.get<Organization>("/organizations/me"),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => api.patch<Organization>("/organizations/me", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization"] }),
  });
}

export function useUpdateLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadFile<Organization>("/organizations/me/logo", "logo", file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization"] }),
  });
}
