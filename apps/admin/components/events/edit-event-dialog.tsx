'use client';

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUpdateEvent, type ClubEvent } from "@/hooks/use-events";
import { ApiClientError } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";


const eventSchema = z.object({
    title: z.string()
    .min(2, "Enter a title"),
    location: z.string().optional(),
    description: z.string().optional(),
    startsAt: z.string().datetime({ offset: true }).min(1, "Choose a start date and time"),
    endsAt: z.string().datetime({ offset: true }).optional(),
    capacity: z.coerce.number().positive().optional().or(z.literal("")),
    ticketPrice: z.coerce.number().positive().optional().or(z.literal("")),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EditEventDialogProps {
    event: ClubEvent | null;
    onOpenChange: (open: boolean) => void;
}



/**
 * DateTime-local inputs need "YYYY-MM-DDTHH:mm" in the browser's
 * local timezone. The backend stores dates in UTC, so we need to convert
 * to and from UTC when displaying and submitting the form.
 * ISO for the API
 */

function toDateTimeLocalValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditEventDialog({ event, onOpenChange}: EditEventDialogProps) {
    const { toast } = useToast();
    const updateEvent = useUpdateEvent();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<EventFormValues>({ resolver: zodResolver(eventSchema) });

    /**
     * re-populate the form whenever a different event is opened * for editing
     */

    useEffect(() => {
        if(!event) return;
        reset({
            title: event.title,
            location: event.location ?? "",
            startsAt: toDateTimeLocalValue(event.startsAt),
            endsAt: event.endsAt ? toDateTimeLocalValue(event.endsAt) : "",
            capacity: event.capacity ?? "",
            ticketPrice: event.ticketPrice ? event.ticketPrice / 100 : "",
        });
    }, [event, reset]);


    async function onSubmit(values: EventFormValues) {
        if (!event) return;
        try {
            await updateEvent.mutateAsync({
                eventId: event.id,
                input: {
                    title: values.title,
                    location: values.location || undefined,
                    description: values.description || undefined,
                    startsAt: new Date(values.startsAt).toISOString(),
                    endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
                    capacity: values.capacity ? Number(values.capacity) : undefined,
                    ticketPrice: values.ticketPrice ? Math.round(Number(values.ticketPrice) * 100) : undefined,
                },
            });
            toast({ title: "Event updated", variant: "success" });
            reset();
            onOpenChange(false);
        } catch (err) {
            toast({
                title: "Couldn't update event",
                description: err instanceof ApiClientError ? err.message : "Please try again.",
                variant: "destructive",
            });
        }
    }


    return (
        <Dialog open={!event} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit event</DialogTitle>
                    <DialogDescription>
                        Chabges are visible to members instantly.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-event-title">
                            Title
                        </Label>
                        <Input id="edir-event-title" placeholder="February General Meeting" {...register("title")} />
                        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-event-starts-at">
                                Starts at
                            </Label>
                            <Input type="datetime-local" id="edit-event-starts-at" {...register("startsAt")} />
                            {errors.startsAt && <p className="text-xs text-destructive">{errors.startsAt.message}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-event-ends-at">
                                Ends at (optional)
                            </Label>
                            <Input type="datetime-local" id="edit-event-end" {...register("endsAt")} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-event-location">
                            Location (optional)
                        </Label>
                        <Input id="edit-event-location" placeholder="MovenPick Ambassador Hotel, Accra" {...register("location")} />
                    </div>

                    <div className="flex flex-cola-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-event-capacity">
                                Capacity (optional)
                            </Label>
                            <Input id="edit-event-capacity" type="number" {...register("capacity")} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-event-ticket-price">
                                Ticket price (optional)
                            </Label>
                            <Input id="edit-event-ticket-price" type="number" step="0.01" min="0" {...register("ticketPrice")} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

