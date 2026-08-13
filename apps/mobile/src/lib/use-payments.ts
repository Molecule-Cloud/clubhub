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

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) => api.get<{ status: string; paymentId: string }>(`/payments/verify/${reference}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-payments"] });
    },
  });
}
