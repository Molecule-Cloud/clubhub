"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { usePermissionCatalog, useSetRolePermissions, useRenameRole, type RoleWithPermissions } from "@/hooks/use-roles";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface RoleEditorDialogProps {
  role: RoleWithPermissions | null;
  onClose: () => void;
}

export function RoleEditorDialog({ role, onClose }: RoleEditorDialogProps) {
  const { data: catalog } = usePermissionCatalog();
  const setPermissions = useSetRolePermissions();
  const renameRole = useRenameRole();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setSelected(new Set(role.rolePermissions.map((rp) => rp.permission.key)));
    }
  }, [role]);

  function togglePermission(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    if (!role) return;
    setIsSaving(true);
    try {
      if (name !== role.name) {
        await renameRole.mutateAsync({ roleId: role.id, name });
      }
      await setPermissions.mutateAsync({ roleId: role.id, permissions: Array.from(selected) });
      toast({ title: "Role updated", variant: "success" });
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't update role",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={!!role} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>
            {role?.isDefault ? "This is a default role — you can rename it and adjust its permissions, but it can't be deleted." : "Custom role."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role-name">Role name</Label>
          <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Permissions</Label>
          <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border p-3">
            {catalog?.data.map((perm) => (
              <label key={perm.key} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-secondary/50">
                <input
                  type="checkbox"
                  checked={selected.has(perm.key)}
                  onChange={() => togglePermission(perm.key)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <div>
                  <p className="text-sm font-medium">{perm.key}</p>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
