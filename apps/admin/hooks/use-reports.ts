import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface RevenuePoint {
  period: string;
  totalMinorUnits: number;
  transactionCount: number;
}

interface RevenueByCategory {
  categoryName: string;
  categoryType: string;
  totalMinorUnits: number;
  transactionCount: number;
}

interface MembershipBreakdown {
  status: string;
  count: number;
}

interface MembershipGrowthPoint {
  period: string;
  newMembers: number;
}

interface OutstandingDuesMember {
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface OutstandingDues {
  periodFrom: string;
  periodTo: string;
  membersWithoutDuesPayment: OutstandingDuesMember[];
}

interface AttendanceByEvent {
  eventId: string | null;
  eventTitle: string | null;
  attended: number;
}

interface ProjectFunding {
  id: string;
  title: string;
  budget: number | null;
  raisedAmount: number;
  fundingPercent: number | null;
}

export function useRevenueSummary(bucket: "day" | "month" | "year" = "month") {
  return useQuery({
    queryKey: ["reports", "revenue", bucket],
    queryFn: () => api.get<RevenuePoint[]>(`/reports/revenue?bucket=${bucket}`),
    select: (res) => res.data,
  });
}

export function useRevenueByCategory() {
  return useQuery({
    queryKey: ["reports", "revenue-by-category"],
    queryFn: () => api.get<RevenueByCategory[]>("/reports/revenue/by-category"),
    select: (res) => res.data,
  });
}

export function useMembershipBreakdown() {
  return useQuery({
    queryKey: ["reports", "membership-breakdown"],
    queryFn: () => api.get<MembershipBreakdown[]>("/reports/membership/breakdown"),
    select: (res) => res.data,
  });
}

export function useMembershipGrowth(bucket: "day" | "month" | "year" = "month") {
  return useQuery({
    queryKey: ["reports", "membership-growth", bucket],
    queryFn: () => api.get<MembershipGrowthPoint[]>(`/reports/membership/growth?bucket=${bucket}`),
    select: (res) => res.data,
  });
}

export function useOutstandingDues() {
  return useQuery({
    queryKey: ["reports", "outstanding-dues"],
    queryFn: () => api.get<OutstandingDues>("/reports/outstanding-dues"),
    select: (res) => res.data,
  });
}

export function useAttendanceByEvent() {
  return useQuery({
    queryKey: ["reports", "attendance-by-event"],
    queryFn: () => api.get<AttendanceByEvent[]>("/reports/attendance"),
    select: (res) => res.data,
  });
}

export function useProjectsFunding() {
  return useQuery({
    queryKey: ["reports", "projects-funding"],
    queryFn: () => api.get<ProjectFunding[]>("/reports/projects/funding"),
    select: (res) => res.data,
  });
}
