import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api-client";

export interface PaymentCategory {
  id: string;
  name: string;
  type: string;
  isRecurring: boolean;
  defaultAmount: number | null;
  isActive: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  gateway: string;
  gatewayRef: string;
  paidAt: string | null;
  createdAt: string;
  category: { name: string; type: string };
  membership: { user: { firstName: string; lastName: string } };
  receipt: { id: string; receiptNumber: string; pdfUrl: string } | null;
}

interface ListPaymentsFilters {
  status?: string;
  categoryId?: string;
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

export function usePayments(filters: ListPaymentsFilters) {
  return useQuery({
    queryKey: ["payments", filters],
    queryFn: () => api.get<Payment[]>(`/payments${buildQuery(filters)}`),
  });
}

export function usePaymentCategories() {
  return useQuery({
    queryKey: ["payment-categories"],
    queryFn: () => api.get<PaymentCategory[]>("/payments/categories"),
  });
}

export function useCreatePaymentCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type: string; isRecurring: boolean; defaultAmount?: number }) =>
      api.post("/payments/categories", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-categories"] }),
  });
}

export function useUpdatePaymentCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      ...input
    }: {
      categoryId: string;
      name?: string;
      isRecurring?: boolean;
      defaultAmount?: number | null;
      isActive?: boolean;
    }) => api.patch(`/payments/categories/${categoryId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-categories"] }),
  });
}

export function useRecordManualPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { membershipId: string; categoryId: string; amount: number; notes?: string }) =>
      api.post("/payments/manual", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, amount }: { paymentId: string; amount?: number }) =>
      api.post(`/payments/${paymentId}/refund`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

/**
 * CSV export triggers a browser download. Rather than putting the access
 * token in the URL as a query param (which would leak it into browser
 * history, server access logs, and the Referer header on any outbound
 * link from the resulting page), this fetches the CSV with a normal
 * Authorization header — same as every other API call — and constructs
 * a client-side blob download from the response.
 */
export async function downloadPaymentsCsv(filters: { status?: string; from?: string; to?: string }) {
  const token = getAccessToken();
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][]
  );

  const res = await fetch(`${base}/reports/export/payments.csv?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to export payments.");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
