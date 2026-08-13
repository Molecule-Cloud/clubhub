"use client";

import { useState } from "react";
import { MoreHorizontal, MapPin, QrCode, Users } from "lucide-react";
import { useEvents, useDeleteEvent, type ClubEvent } from "@/hooks/use-events";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { EventDetailDialog } from "@/components/events/event-detail-dialog";

function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat("en-GH", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export default function EventsPage() {
  const { data, isLoading } = useEvents();
  const deleteEvent = useDeleteEvent();
  const { toast } = useToast();
  const [detailEvent, setDetailEvent] = useState<ClubEvent | null>(null);

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event? Registrations and attendance records will be removed.")) return;
    try {
      await deleteEvent.mutateAsync(eventId);
      toast({ title: "Event deleted", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't delete event", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  const events = data?.data ?? [];
  const now = Date.now();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">Meetings, fundraisers, and gatherings.</p>
        </div>
        <CreateEventDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading events…</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">No events yet. Create your first one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const isPast = new Date(event.startsAt).getTime() < now;
            return (
              <Card key={event.id}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display font-semibold">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatEventDate(event.startsAt)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailEvent(event)}>
                          <QrCode className="mr-2 h-4 w-4" />
                          View check-in QR
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => handleDelete(event.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {event.location && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {event._count.registrations} registered
                      {event.capacity ? ` / ${event.capacity} capacity` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPast && <Badge variant="secondary">Past</Badge>}
                    {event.ticketPrice ? (
                      <Badge variant="category">{formatMoney(event.ticketPrice)}</Badge>
                    ) : (
                      <Badge variant="success">Free</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EventDetailDialog
        eventId={detailEvent?.id ?? null}
        eventTitle={detailEvent?.title}
        onOpenChange={(open) => !open && setDetailEvent(null)}
      />
    </div>
  );
}
