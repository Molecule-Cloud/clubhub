"use client";

import { useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { useMembers, useUpdateMemberStatus, useRemoveMember, type Member } from "@/hooks/use-members";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { InviteMemberDialog } from "@/components/members/invite-member-dialog";
import { ChangeRoleDialog } from "@/components/members/change-role-dialog";

const STATUS_VARIANT: Record<Member["status"], "success" | "pending" | "secondary" | "outline"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  SUSPENDED: "pending",
  ALUMNI: "outline",
};

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [roleChangeMember, setRoleChangeMember] = useState<Member | null>(null);
  const { data, isLoading } = useMembers({ search: search || undefined, status });
  const updateStatus = useUpdateMemberStatus();
  const removeMember = useRemoveMember();
  const { toast } = useToast();

  async function handleStatusChange(membershipId: string, newStatus: Member["status"]) {
    try {
      await updateStatus.mutateAsync({ membershipId, status: newStatus });
      toast({ title: "Member updated", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't update member", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleRemove(membershipId: string, name: string) {
    if (!confirm(`Remove ${name} from the organization? This can't be undone.`)) return;
    try {
      await removeMember.mutateAsync(membershipId);
      toast({ title: "Member removed", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't remove member",
        description:
          err instanceof ApiClientError
            ? err.message
            : "This member may have payment history — deactivate them instead of removing.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">Manage your organization's member directory.</p>
        </div>
        <InviteMemberDialog />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select onValueChange={(v) => setStatus(v === "ALL" ? undefined : v)} defaultValue="ALL">
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="ALUMNI">Alumni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Membership No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Loading members…
                  </TableCell>
                </TableRow>
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No members found. Invite someone to get started.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{member.role.name}</TableCell>
                    <TableCell className="font-mono text-xs">{member.membershipNumber}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[member.status]}>{member.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(member.joinedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setRoleChangeMember(member)}>Change role</DropdownMenuItem>
                          {member.status !== "ACTIVE" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(member.id, "ACTIVE")}>Activate</DropdownMenuItem>
                          )}
                          {member.status !== "SUSPENDED" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(member.id, "SUSPENDED")}>Suspend</DropdownMenuItem>
                          )}
                          {member.status !== "INACTIVE" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(member.id, "INACTIVE")}>Deactivate</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            destructive
                            onClick={() => handleRemove(member.id, `${member.user.firstName} ${member.user.lastName}`)}
                          >
                            Remove from organization
                          </DropdownMenuItem>
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

      <ChangeRoleDialog member={roleChangeMember} onClose={() => setRoleChangeMember(null)} />
    </div>
  );
}
