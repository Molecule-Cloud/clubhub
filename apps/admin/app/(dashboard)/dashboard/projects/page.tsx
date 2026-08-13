"use client";

import { useState } from "react";
import { FolderKanban, Milestone } from "lucide-react";
import { useProjects, useUpdateProjectStatus, type Project } from "@/hooks/use-projects";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectDetailDialog } from "@/components/projects/project-detail-dialog";

const STATUS_VARIANT: Record<Project["status"], "success" | "pending" | "secondary" | "outline"> = {
  ACTIVE: "success",
  PLANNING: "pending",
  COMPLETED: "outline",
  CANCELLED: "secondary",
};

export default function ProjectsPage() {
  const { data, isLoading } = useProjects();
  const updateStatus = useUpdateProjectStatus();
  const { toast } = useToast();
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

  async function handleStatusChange(projectId: string, status: Project["status"]) {
    try {
      await updateStatus.mutateAsync({ projectId, status });
      toast({ title: "Project updated", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't update project", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  const projects = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Community initiatives and fundraising campaigns.</p>
        </div>
        <CreateProjectDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No projects yet. Create your first one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const fundingPercent = project.budget ? Math.min(100, Math.round((project.raisedAmount / project.budget) * 100)) : null;
            return (
              <Card key={project.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setOpenProjectId(project.id)}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-semibold">{project.title}</p>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select value={project.status} onValueChange={(v) => handleStatusChange(project.id, v as Project["status"])}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLANNING">Planning</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono font-medium">{formatMoney(project.raisedAmount)}</span>
                      {project.budget && <span className="text-xs text-muted-foreground">of {formatMoney(project.budget)}</span>}
                    </div>
                    {fundingPercent !== null && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-node-violet" style={{ width: `${fundingPercent}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Milestone className="h-3 w-3" />
                      {project._count.milestones} milestones
                    </span>
                    <span>{project._count.contributions} contributions</span>
                    <Badge variant={STATUS_VARIANT[project.status]} className="ml-auto">
                      {project.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectDetailDialog projectId={openProjectId} onOpenChange={(open) => !open && setOpenProjectId(null)} />
    </div>
  );
}
