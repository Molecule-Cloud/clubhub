"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Megaphone } from "lucide-react";
import { ApiClientError } from "@/lib/auth-context";
import { useCreateAnnouncement } from "@/hooks/use-announcements";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const announcementSchema = z.object({
  title: z.string().min(1, "Enter a title").max(200),
  body: z.string().min(1, "Enter a message").max(10000),
  sendEmail: z.boolean().default(true),
});
type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export function CreateAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createAnnouncement = useCreateAnnouncement();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { sendEmail: true },
  });

  async function onSubmit(values: AnnouncementFormValues) {
    try {
      await createAnnouncement.mutateAsync({
        title: values.title,
        body: values.body,
        sendEmail: values.sendEmail,
        sendPush: false, // push isn't wired to real device tokens yet (Phase 4) — see backend lib/push.ts
      });
      toast({ title: "Announcement sent", variant: "success" });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Couldn't send announcement",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Megaphone className="h-4 w-4" />
          New announcement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>Sent by email to every active member of your organization.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-title">Title</Label>
            <Input id="announcement-title" placeholder="Upcoming general meeting" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-body">Message</Label>
            <textarea
              id="announcement-body"
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Join us this Saturday at..."
              {...register("body")}
            />
            {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send to all members"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
