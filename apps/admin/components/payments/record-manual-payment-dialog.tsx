"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { ApiClientError } from "@/lib/auth-context";
import { useRecordManualPayment, usePaymentCategories } from "@/hooks/use-payments";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

const manualPaymentSchema = z.object({
  membershipId: z.string().min(1, "Choose a member"),
  categoryId: z.string().min(1, "Choose a category"),
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  notes: z.string().optional(),
});
type ManualPaymentFormValues = z.infer<typeof manualPaymentSchema>;

export function RecordManualPaymentDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const recordPayment = useRecordManualPayment();
  const { data: categories } = usePaymentCategories();
  const { data: members } = useQuery({
    queryKey: ["members", { forPaymentDialog: true }],
    queryFn: () => api.get<{ id: string; user: { firstName: string; lastName: string } }[]>("/members?pageSize=100"),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ManualPaymentFormValues>({ resolver: zodResolver(manualPaymentSchema) });

  async function onSubmit(values: ManualPaymentFormValues) {
    try {
      // Form collects a whole-currency amount (e.g. "50.00" GHS) for a
      // treasurer's convenience — converted to minor units (pesewas) here
      // at the boundary, matching every other amount in the system.
      await recordPayment.mutateAsync({
        membershipId: values.membershipId,
        categoryId: values.categoryId,
        amount: Math.round(values.amount * 100),
        notes: values.notes,
      });
      toast({ title: "Payment recorded", variant: "success" });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Couldn't record payment",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" />
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a manual payment</DialogTitle>
          <DialogDescription>For cash, bank transfer, or other offline payments.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-member">Member</Label>
            <Select onValueChange={(v) => setValue("membershipId", v, { shouldValidate: true })}>
              <SelectTrigger id="payment-member">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members?.data.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.user.firstName} {m.user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.membershipId && <p className="text-xs text-destructive">{errors.membershipId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-category">Category</Label>
            <Select onValueChange={(v) => setValue("categoryId", v, { shouldValidate: true })}>
              <SelectTrigger id="payment-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">Amount (GHS)</Label>
            <Input id="payment-amount" type="number" step="0.01" min="0" placeholder="50.00" {...register("amount")} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-notes">Notes (optional)</Label>
            <Input id="payment-notes" placeholder="e.g. Cash collected at Feb meeting" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
