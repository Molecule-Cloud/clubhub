import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";

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
  receipt: { id: string; receiptNumber: string; pdfUrl: string } | null;
}

/** The treasurer's view of a pending cash payment needs to know *whose*
 * payment it is — unlike Payment above, which is always the current
 * member's own history, where that would be redundant. */
export interface PendingCashPayment {
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
  category: { name: string };
  membership: { user: { firstName: string; lastName: string } };
}

export function usePaymentCategories() {
  return useQuery({
    queryKey: ["payment-categories"],
    queryFn: () => api.get<PaymentCategory[]>("/payments/categories"),
    select: (res) => res.data.filter((c) => c.isActive),
  });
}

export function useMyPayments() {
  return useQuery({
    queryKey: ["my-payments"],
    queryFn: () => api.get<Payment[]>("/payments/me"),
    select: (res) => res.data,
  });
}

interface InitializePaymentInput {
  categoryId: string;
  amount: number; // minor units
  callbackUrl: string;
}

export function useInitializePayment() {
  return useMutation({
    mutationFn: (input: InitializePaymentInput) =>
      api.post<{ paymentId: string; authorizationUrl: string; reference: string }>("/payments/initialize", input),
  });
}

interface RequestCashPaymentInput {
  categoryId: string;
  amount: number; // minor units
  projectId?: string;
}

export function useRequestCashPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestCashPaymentInput) => api.post<Payment>("/payments/cash", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-payments"] }),
  });
}

export function usePendingCashPayments() {
  return useQuery({
    queryKey: ["payments", "pending-cash"],
    queryFn: () => api.get<PendingCashPayment[]>("/payments/pending-cash"),
    retry: false,
    refetchInterval: 30000,
  });
}

export function useConfirmCashPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => api.post(`/payments/${paymentId}/confirm-cash`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-payments"] }),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) => api.get<{ status: string; paymentId: string }>(`/payments/verify/${reference}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-payments"] });
    },
  });
}