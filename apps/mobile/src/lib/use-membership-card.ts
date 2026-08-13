import { useQuery } from "@tanstack/react-query";
import { api } from "./api-client";

export interface MembershipCard {
  membershipNumber: string;
  memberName: string;
  role: string;
  status: string;
  joinedAt: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  primaryColor: string | null;
  qrCodeDataUrl: string;
}

export function useMembershipCard() {
  return useQuery({
    queryKey: ["membership-card"],
    queryFn: () => api.get<MembershipCard>("/members/me/card"),
    select: (res) => res.data,
  });
}
