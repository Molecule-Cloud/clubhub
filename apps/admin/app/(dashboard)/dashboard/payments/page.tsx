"use client";

import { useState } from "react";
import { Download, MoreHorizontal, FileText } from "lucide-react";
import { usePayments, useRefundPayment, downloadPaymentsCsv, type Payment } from "@/hooks/use-payments";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { formatMoney, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { RecordManualPaymentDialog } from "@/components/payments/record-manual-payment-dialog";
import { ManageCategoriesDialog } from "@/components/payments/manage-categories-dialog";
import { PendingCashConfirmations } from "@/components/payments/pending-cash-confirmations";

const STATUS_VARIANT: Record<Payment["status"], "success" | "pending" | "destructive" | "secondary"> = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

export default function PaymentsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading } = usePayments({ status });
  const refundPayment = useRefundPayment();
  const { toast } = useToast();

  async function handleRefund(paymentId: string) {
    if (!confirm("Refund this payment? This cannot be undone.")) return;
    try {
      await refundPayment.mutateAsync({ paymentId });
      toast({ title: "Payment refunded", variant: "success" });
    } catch (err) {
      toast({ title: "Refund failed", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadPaymentsCsv({ status });
    } catch {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  const totalSuccess = (data?.data ?? []).filter((p) => p.status === "SUCCESS").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground">Track dues, donations, and contributions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting…" : "Export CSV"}
          </Button>
          <ManageCategoriesDialog />
          <RecordManualPaymentDialog />
        </div>
      </div>

      <PendingCashConfirmations />

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-node-emerald/10">
            <FileText className="h-5 w-5 text-node-emerald" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total (filtered view)</p>
            <p className="font-mono text-xl font-semibold">{formatMoney(totalSuccess)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select onValueChange={(v) => setStatus(v === "ALL" ? undefined : v)} defaultValue="ALL">
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Loading payments…
                  </TableCell>
                </TableRow>
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payment.paidAt ?? payment.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.membership.user.firstName} {payment.membership.user.lastName}
                    </TableCell>
                    <TableCell>{payment.category.name}</TableCell>
                    <TableCell className="font-mono">{formatMoney(payment.amount, payment.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[payment.status]}>{payment.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.gateway === "CASH" && payment.status === "PENDING" ? "Cash (unconfirmed)" : payment.gateway}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {payment.receipt && (
                            <DropdownMenuItem onClick={() => window.open(payment.receipt!.pdfUrl, "_blank")}>
                              View receipt
                            </DropdownMenuItem>
                          )}
                          {payment.status === "SUCCESS" && (
                            <DropdownMenuItem destructive onClick={() => handleRefund(payment.id)}>
                              Refund
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}