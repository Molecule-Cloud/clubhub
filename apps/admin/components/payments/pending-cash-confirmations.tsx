"use client";

import { Banknote } from "lucide-react";
import { usePendingCashPayments, useConfirmCashPayment } from "@/hooks/use-payments";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { formatMoney, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PendingCashConfirmations() {
  const { data, isLoading } = usePendingCashPayments();
  const confirmCashPayment = useConfirmCashPayment();
  const { toast } = useToast();

  const pending = data?.data ?? [];

  async function handleConfirm(paymentId: string, memberName: string) {
    if (!confirm(`Confirm you've received cash from ${memberName}? This marks the payment as paid.`)) return;
    try {
      await confirmCashPayment.mutateAsync(paymentId);
      toast({ title: "Payment confirmed", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't confirm payment",
        description: err instanceof ApiClientError ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  // Nothing to act on — stay out of the way entirely rather than show an
  // empty state that just adds noise to a page treasurers visit often.
  if (isLoading || pending.length === 0) return null;

  return (
    <Card className="border-node-amber/40 bg-node-amber/5">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-node-amber" />
          <p className="font-display font-semibold">
            {pending.length} cash payment{pending.length > 1 ? "s" : ""} awaiting confirmation
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
              <div>
                <p className="text-sm font-medium">
                  {p.membership.user.firstName} {p.membership.user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.category.name} · {formatMoney(p.amount, p.currency)} · Requested {formatDate(p.createdAt)}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleConfirm(p.id, `${p.membership.user.firstName} ${p.membership.user.lastName}`)}
              >
                Confirm receipt
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}