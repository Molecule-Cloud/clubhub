"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { useProject, useCreateMilestone, useToggleMilestone } from "@/hooks/use-projects";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectDetailDialogProps {
  projectId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ProjectDetailDialog({ projectId, onOpenChange }: ProjectDetailDialogProps) {
  const { data, isLoading } = useProject(projectId);
  const createMilestone = useCreateMilestone();
  const toggleMilestone = useToggleMilestone();
  const { toast } = useToast();
  const [newMilestone, setNewMilestone] = useState("");

  async function handleAddMilestone() {
    if (!projectId || !newMilestone.trim()) return;
    try {
      await createMilestone.mutateAsync({ projectId, title: newMilestone.trim() });
      setNewMilestone("");
    } catch (err) {
      toast({ title: "Couldn't add milestone", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleToggle(milestoneId: string, completed: boolean) {
    if (!projectId) return;
    try {
      await toggleMilestone.mutateAsync({ projectId, milestoneId, completed });
    } catch (err) {
      toast({ title: "Couldn't update milestone", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  const project = data?.data;

  return (
    <Dialog open={!!projectId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{project?.title ?? "Project"}</DialogTitle>
          <DialogDescription>{project?.description}</DialogDescription>
        </DialogHeader>

        {isLoading || !project ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Raised</span>
                <span className="font-mono font-medium">
                  {formatMoney(project.raisedAmount)}
                  {project.budget ? ` / ${formatMoney(project.budget)}` : ""}
                </span>
              </div>
              {project.fundingPercent !== null && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-node-violet" style={{ width: `${project.fundingPercent}%` }} />
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Milestones</p>
              <div className="flex flex-col gap-2">
                {project.milestones.length === 0 && <p className="text-sm text-muted-foreground">No milestones yet.</p>}
                {project.milestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleToggle(m.id, !m.completedAt)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/50",
                      m.completedAt && "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        m.completedAt ? "border-node-emerald bg-node-emerald text-white" : "border-input"
                      )}
                    >
                      {m.completedAt && <Check className="h-3 w-3" />}
                    </span>
                    <span className={cn("flex-1", m.completedAt && "line-through")}>{m.title}</span>
                    {m.dueDate && <Badge variant="outline">{formatDate(m.dueDate)}</Badge>}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Add a milestone…"
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
                />
                <Button variant="outline" size="icon" onClick={handleAddMilestone}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
