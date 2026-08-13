"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, ShieldCheck } from "lucide-react";
import { useRoles, useDeleteRole, type RoleWithPermissions } from "@/hooks/use-roles";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CreateRoleDialog } from "@/components/roles/create-role-dialog";
import { RoleEditorDialog } from "@/components/roles/role-editor-dialog";

export default function RolesPage() {
  const { data, isLoading } = useRoles();
  const deleteRole = useDeleteRole();
  const { toast } = useToast();
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);

  async function handleDelete(role: RoleWithPermissions) {
    if (!confirm(`Delete the "${role.name}" role? This can't be undone.`)) return;
    try {
      await deleteRole.mutateAsync(role.id);
      toast({ title: "Role deleted", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't delete role",
        description: err instanceof ApiClientError ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/settings" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground">Control what each role in your organization can do.</p>
          </div>
          <CreateRoleDialog />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading roles…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data?.data.map((role) => (
            <Card key={role.id}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-display font-semibold">{role.name}</span>
                    {role.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingRole(role)}>Edit</DropdownMenuItem>
                      {!role.isDefault && (
                        <DropdownMenuItem destructive onClick={() => handleDelete(role)}>
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground">
                  {role._count.memberships} member{role._count.memberships === 1 ? "" : "s"} · {role.rolePermissions.length} permission
                  {role.rolePermissions.length === 1 ? "" : "s"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.rolePermissions.slice(0, 4).map((rp) => (
                    <Badge key={rp.permission.key} variant="outline" className="text-[10px]">
                      {rp.permission.key}
                    </Badge>
                  ))}
                  {role.rolePermissions.length > 4 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{role.rolePermissions.length - 4} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoleEditorDialog role={editingRole} onClose={() => setEditingRole(null)} />
    </div>
  );
}
