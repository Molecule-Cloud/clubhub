"use client";

import { useCheckinQrCode, useEventRegistrations } from "@/hooks/use-events";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface EventDetailDialogProps {
  eventId: string | null;
  eventTitle?: string;
  onOpenChange: (open: boolean) => void;
}

/** Combines the check-in QR (for the venue poster) with the live
 * registration list — a treasurer/secretary opens this once per event
 * rather than navigating to a separate detail page, keeping this chunk's
 * scope to one dialog instead of a full event-detail route. */
export function EventDetailDialog({ eventId, eventTitle, onOpenChange }: EventDetailDialogProps) {
  const { data: qr, isLoading: qrLoading } = useCheckinQrCode(eventId);
  const { data: registrations, isLoading: regsLoading } = useEventRegistrations(eventId);

  return (
    <Dialog open={!!eventId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{eventTitle ?? "Event details"}</DialogTitle>
          <DialogDescription>Check-in code and current registrations.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary/40 p-4">
          {qrLoading ? (
            <div className="flex h-40 w-40 items-center justify-center text-xs text-muted-foreground">Loading…</div>
          ) : qr?.data.qrCodeDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not an optimizable remote image
            <img src={qr.data.qrCodeDataUrl} alt="Event check-in QR code" className="h-40 w-40" />
          ) : null}
          <p className="text-center text-xs text-muted-foreground">Display or print this at the venue for self check-in.</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Registrations {registrations ? `(${registrations.data.length})` : ""}</p>
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {regsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !registrations?.data.length ? (
              <p className="text-sm text-muted-foreground">No one has registered yet.</p>
            ) : (
              registrations.data.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>
                    {r.membership.user.firstName} {r.membership.user.lastName}
                  </span>
                  <Badge variant={r.status === "ATTENDED" ? "success" : "secondary"}>{r.status}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
