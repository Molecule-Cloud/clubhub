"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useCreateEvent } from "@/hooks/use-events";
import { ApiClientError } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

const eventSchema = z.object({
  title: z.string().min(2, "Enter a title"),
  location: z.string().optional(),
  description: z.string().optional(),
  startsAt: z.string().min(1, "Choose a start date and time"),
  endsAt: z.string().optional(),
  capacity: z.coerce.number().positive().optional().or(z.literal("")),
  ticketPrice: z.coerce.number().positive().optional().or(z.literal("")),
});
type EventFormValues = z.infer<typeof eventSchema>;

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createEvent = useCreateEvent();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({ resolver: zodResolver(eventSchema) });

  async function onSubmit(values: EventFormValues) {
    try {
      await createEvent.mutateAsync({
        title: values.title,
        location: values.location || undefined,
        description: values.description || undefined,
        // datetime-local inputs give "2026-08-01T10:00" with no timezone —
        // interpreted as the browser's local time, which is correct for a
        // club admin scheduling an event in their own timezone.
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
        // ticketPrice collected in whole GHS for admin convenience, same
        // pattern as the manual payment dialog — converted to pesewas here.
        ticketPrice: values.ticketPrice ? Math.round(Number(values.ticketPrice) * 100) : undefined,
      });
      toast({ title: "Event created", variant: "success" });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Couldn't create event",
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
          New event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an event</DialogTitle>
          <DialogDescription>Members will be able to RSVP and check in with a QR code.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" placeholder="February General Meeting" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-start">Starts at</Label>
              <Input id="event-start" type="datetime-local" {...register("startsAt")} />
              {errors.startsAt && <p className="text-xs text-destructive">{errors.startsAt.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-end">Ends at (optional)</Label>
              <Input id="event-end" type="datetime-local" {...register("endsAt")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-location">Location</Label>
            <Input id="event-location" placeholder="Movenpick Ambassador Hotel, Accra" {...register("location")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-capacity">Capacity (optional)</Label>
              <Input id="event-capacity" type="number" min="1" placeholder="100" {...register("capacity")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-ticket">Ticket price GHS (optional)</Label>
              <Input id="event-ticket" type="number" step="0.01" min="0" placeholder="Free" {...register("ticketPrice")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
