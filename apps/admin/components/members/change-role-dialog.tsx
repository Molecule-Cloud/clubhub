"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useUpdateMemberRole, type Member } from "@/hooks/use-members";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ChangeRoleDialogProps {
  member: Member | null;
  onClose: () => void;
}

export function ChangeRoleDialog({ member, onClose }: ChangeRoleDialogProps) {
  const [roleId, setRoleId] = useState<string | null>(null);
  const updateRole = useUpdateMemberRole();
  const { toast } = useToast();

  useEffect(() => {
    setRoleId(member?.role.id ?? null);
  }, [member]);
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/members/roles"),
    enabled: !!member,
  });

  async function handleSave() {
    if (!member || !roleId) return;
    try {
      await updateRole.mutateAsync({ membershipId: member.id, roleId });
      toast({ title: "Role updated", variant: "success" });
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't update role",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            {member ? `Update the role for ${member.user.firstName} ${member.user.lastName}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="change-role-select">New role</Label>
          <Select key={member?.id} defaultValue={member?.role.id} onValueChange={setRoleId}>
            <SelectTrigger id="change-role-select">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles?.data.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!roleId || roleId === member?.role.id || updateRole.isPending}>
            {updateRole.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
