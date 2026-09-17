"use client";

import { useState } from "react";
import { useJoinRequests, useApproveJoinRequest, useRejectJoinRequest, type JoinRequest } from "@/hooks/use-join-requests";
import { useRoles } from "@/hooks/use-members";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const STATUS_VARIANT: Record<JoinRequest["status"], "success" | "pending" | "secondary"> = {
  APPROVED: "success",
  PENDING: "pending",
  REJECTED: "secondary",
};

export default function JoinRequestsPage() {
  const [status, setStatus] = useState<string | undefined>("PENDING");
  const [selectedRoleByRequest, setSelectedRoleByRequest] = useState<Record<string, string>>({});
  const { data, isLoading } = useJoinRequests({ status });
  const { data: rolesData } = useRoles();
  const approve = useApproveJoinRequest();
  const reject = useRejectJoinRequest();
  const { toast } = useToast();

  const roles = rolesData?.data ?? [];

  async function handleApprove(request: JoinRequest) {
    const roleId = selectedRoleByRequest[request.id];
    if (!roleId) {
      toast({ title: "Choose a role first", variant: "destructive" });
      return;
    }
    try {
      await approve.mutateAsync({ joinRequestId: request.id, roleId });
      toast({ title: `Invitation sent to ${request.email}`, variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't approve request", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleReject(request: JoinRequest) {
    if (!confirm(`Reject the join request from ${request.firstName} ${request.lastName}?`)) return;
    try {
      await reject.mutateAsync(request.id);
      toast({ title: "Request rejected", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't reject request", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Join Requests</h1>
          <p className="text-sm text-muted-foreground">People who requested to join from the public landing page.</p>
        </div>
        <Select onValueChange={(v) => setStatus(v === "ALL" ? undefined : v)} defaultValue="PENDING">
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>From event</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-72">Role</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Loading requests…
                  </TableCell>
                </TableRow>
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No join requests found.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {request.firstName} {request.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{request.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{request.event?.title ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(request.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === "PENDING" ? (
                        <Select onValueChange={(v) => setSelectedRoleByRequest((prev) => ({ ...prev, [request.id]: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(request)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(request)}>
                            Reject
                          </Button>
                        </div>
                      )}
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