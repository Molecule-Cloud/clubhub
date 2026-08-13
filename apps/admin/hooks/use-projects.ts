import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Project {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  raisedAmount: number;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  _count: { contributions: number; milestones: number };
}

export interface ProjectDetail extends Project {
  fundingPercent: number | null;
  milestones: { id: string; title: string; dueDate: string | null; completedAt: string | null }[];
}

interface CreateProjectInput {
  title: string;
  description: string;
  budget?: number;
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/projects"),
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.get<ProjectDetail>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post("/projects", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: Project["status"] }) =>
      api.patch(`/projects/${projectId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, title, dueDate }: { projectId: string; title: string; dueDate?: string }) =>
      api.post(`/projects/${projectId}/milestones`, { title, dueDate }),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["projects", vars.projectId] }),
  });
}

export function useToggleMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, milestoneId, completed }: { projectId: string; milestoneId: string; completed: boolean }) =>
      api.patch(`/projects/${projectId}/milestones/${milestoneId}`, { completed }),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["projects", vars.projectId] }),
  });
}
