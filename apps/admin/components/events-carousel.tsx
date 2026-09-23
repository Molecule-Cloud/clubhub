"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin } from "lucide-react";
import { usePublicEvents } from "@/hooks/use-public-events";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat("en-GH", { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
}

export function EventsCarousel() {
  const { data } = usePublicEvents();
  const events = data?.data ?? [];
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (!events.length) return null;

  function scrollByAmount(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * 336, behavior: "smooth" });
  }

  return (
    <section className="flex flex-col gap-6 px-6 py-12 sm:px-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Happening on ClubHub</h2>
          <p className="text-muted-foreground">Public events from clubs and organizations on the platform.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Scroll left"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Scroll right"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {events.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`} className="w-[280px] shrink-0 snap-start sm:w-[320px]">
            <Card className="h-full transition-shadow duration-200 hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  {event.organization.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.organization.logoUrl} alt="" className="h-6 w-6 rounded object-contain" />
                  ) : null}
                  <p className="truncate text-xs font-medium text-muted-foreground">{event.organization.name}</p>
                </div>
                <p className="font-display font-semibold leading-snug">{event.title}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {formatEventDate(event.startsAt)}
                </p>
                {event.location && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </p>
                )}
                <div className="mt-auto pt-1">
                  <Badge variant={event.ticketPrice ? "category" : "success"}>
                    {event.ticketPrice ? `GHS ${(event.ticketPrice / 100).toFixed(2)}` : "Free"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}