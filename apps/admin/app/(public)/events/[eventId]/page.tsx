"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, CalendarDays } from "lucide-react";
import { usePublicEvent } from "@/hooks/use-public-events";
import { Button } from "@/components/ui/button";
import { OrgAvatar } from "@/components/org-avatar";

function formatEventDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GH", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export default function PublicEventPage() {
  const params = useParams<{ eventId: string }>();
  const { data, isLoading } = usePublicEvent(params.eventId);
  const event = data?.data;

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">This event isn't available.</p>
        <Link href="/"><Button variant="outline">Back to ClubHub</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-16">
      <div className="flex items-center gap-2">
        {event.organization.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.organization.logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
        ) : (
          <OrgAvatar seed={event.organization.slug} size={32} />
        )}
        <p className="text-sm font-medium text-muted-foreground">{event.organization.name}</p>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold">{event.title}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatEventDateTime(event.startsAt)}
        </p>
        {event.location && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {event.location}
          </p>
        )}
      </div>

      {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}

      <div className="glass flex flex-col gap-3 rounded-2xl p-6">
        <p className="text-center text-sm font-medium">Are you already a member of {event.organization.name}?</p>
        <Link href={`/login?slug=${event.organization.slug}`}>
          <Button className="w-full">Yes, log in</Button>
        </Link>
        <Link href={`/join/${event.organization.slug}?eventId=${event.id}`}>
          <Button variant="outline" className="w-full">No, request to join</Button>
        </Link>
      </div>
    </div>
  );
}