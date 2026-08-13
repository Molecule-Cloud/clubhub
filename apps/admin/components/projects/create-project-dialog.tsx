"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useCreateProject } from "@/hooks/use-projects";
import { ApiClientError } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

const projectSchema = z.object({
  title: z.string().min(2, "Enter a title"),
  description: z.string().min(1, "Describe the project"),
  budget: z.coerce.number().positive().optional().or(z.literal("")),
});
type ProjectFormValues = z.infer<typeof projectSchema>;

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({ resolver: zodResolver(projectSchema) });

  async function onSubmit(values: ProjectFormValues) {
    try {
      await createProject.mutateAsync({
        title: values.title,
        description: values.description,
        // Budget collected in whole GHS for admin convenience, converted to
        // pesewas here — same boundary pattern as payments and events.
        budget: values.budget ? Math.round(Number(values.budget) * 100) : undefined,
      });
      toast({ title: "Project created", variant: "success" });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Couldn't create project",
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
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a project</DialogTitle>
          <DialogDescription>
            Members can contribute via Payments → a "Project Contribution" category linked to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-title">Title</Label>
            <Input id="project-title" placeholder="Clean Water Initiative" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Input id="project-description" placeholder="What is this project about?" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-budget">Budget GHS (optional)</Label>
            <Input id="project-budget" type="number" step="0.01" min="0" placeholder="10000.00" {...register("budget")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
