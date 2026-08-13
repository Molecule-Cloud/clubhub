"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api-client";
import { ApiClientError } from "@/lib/auth-context";
import { useInviteMember } from "@/hooks/use-members";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  roleId: z.string().min(1, "Choose a role"),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const inviteMember = useInviteMember();
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/members/roles"),
    enabled: open, // only fetch once the dialog is actually opened
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema) });

  async function onSubmit(values: InviteFormValues) {
    try {
      await inviteMember.mutateAsync(values);
      toast({ title: "Invitation sent", description: `An invite email was sent to ${values.email}.`, variant: "success" });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Couldn't send invitation",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>They'll receive an email with a link to set up their account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input id="invite-email" type="email" placeholder="member@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select onValueChange={(value) => setValue("roleId", value, { shouldValidate: true })}>
              <SelectTrigger id="invite-role">
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
            {errors.roleId && <p className="text-xs text-destructive">{errors.roleId.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
