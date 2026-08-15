import { prisma, Prisma, scopedCreateData } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";

interface CreateProjectInput {
  title: string;
  description: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

export async function createProject(input: CreateProjectInput) {
  return prisma.project.create({
    data: scopedCreateData<Prisma.ProjectUncheckedCreateInput>({
      title: input.title,
      description: input.description,
      budget: input.budget,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    }), // organizationId injected by the tenant-scoping extension on create
  });
}

interface ListProjectsFilters {
  status?: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  page: number;
  pageSize: number;
}

export async function listProjects(filters: ListProjectsFilters) {
  const where = filters.status ? { status: filters.status } : {};

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contributions: true, milestones: true } } },
    }),
  ]);

  return {
    projects,
    pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) },
  };
}

export async function getProject(projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    include: {
      milestones: { orderBy: { dueDate: "asc" } },
      contributions: {
        orderBy: { createdAt: "desc" },
        take: 20, // recent contributors, not the full ledger — full history via /payments?projectId=
        include: { membership: { include: { user: { select: { firstName: true, lastName: true } } } } },
      },
    },
  });
  if (!project) throw ApiError.notFound("Project not found.");

  const fundingPercent = project.budget ? Math.min(100, Math.round((project.raisedAmount / project.budget) * 100)) : null;

  return { ...project, fundingPercent };
}

export async function updateProject(
  projectId: string,
  updates: Partial<{
    title: string;
    description: string;
    budget: number | null;
    status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
    startDate: string | null;
    endDate: string | null;
  }>
) {
  const existing = await prisma.project.findFirst({ where: { id: projectId } });
  if (!existing) throw ApiError.notFound("Project not found.");

  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...updates,
      startDate: updates.startDate !== undefined ? (updates.startDate ? new Date(updates.startDate) : null) : undefined,
      endDate: updates.endDate !== undefined ? (updates.endDate ? new Date(updates.endDate) : null) : undefined,
    },
  });
}

export async function createMilestone(projectId: string, title: string, dueDate?: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw ApiError.notFound("Project not found.");

  return prisma.projectMilestone.create({
    data: { projectId, title, dueDate: dueDate ? new Date(dueDate) : undefined },
  });
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  updates: { title?: string; dueDate?: string | null; completed?: boolean }
) {
  // ProjectMilestone is a GLOBAL model (scoped transitively via Project —
  // see constants/tenantModels.ts), so we verify the parent Project belongs
  // to this org before touching the milestone, closing the tenant-isolation
  // gap that a transitively-scoped model would otherwise have.
  const milestone = await prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
  if (!milestone) throw ApiError.notFound("Milestone not found.");

  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw ApiError.notFound("Project not found.");

  return prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: {
      title: updates.title,
      dueDate: updates.dueDate !== undefined ? (updates.dueDate ? new Date(updates.dueDate) : null) : undefined,
      completedAt: updates.completed === undefined ? undefined : updates.completed ? new Date() : null,
    },
  });
}
