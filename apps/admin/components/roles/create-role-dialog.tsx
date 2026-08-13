"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePermissionCatalog, useCreateRole } from "@/hooks/use-roles";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: catalog } = usePermissionCatalog();
  const createRole = useCreateRole();
  const { toast } = useToast();

  function togglePermission(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleCreate() {
    try {
      await createRole.mutateAsync({ name, permissions: Array.from(selected) });
      toast({ title: "Role created", variant: "success" });
      setName("");
      setSelected(new Set());
      setOpen(false);
    } catch (err) {
      toast({
        title: "Couldn't create role",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a custom role</DialogTitle>
          <DialogDescription>Give it a name and choose what it can do.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-role-name">Role name</Label>
          <Input id="new-role-name" placeholder="e.g. Program Officer" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Permissions</Label>
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border p-3">
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
          <Button onClick={handleCreate} disabled={!name.trim() || createRole.isPending}>
            {createRole.isPending ? "Creating…" : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
