"use client";

import { Mail, MailX } from "lucide-react";
import { useAnnouncements } from "@/hooks/use-announcements";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateAnnouncementDialog } from "@/components/announcements/create-announcement-dialog";

export default function AnnouncementsPage() {
  const { data, isLoading } = useAnnouncements();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Send updates to your entire membership.</p>
        </div>
        <CreateAnnouncementDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading announcements…</p>
      ) : !data?.data.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="font-medium">No announcements yet</p>
            <p className="text-sm text-muted-foreground">Send your first update to keep members in the loop.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.data.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-5">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <h3 className="font-display font-semibold">{announcement.title}</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    {announcement.sentEmail ? (
                      <Badge variant="success">
                        <Mail className="mr-1 h-3 w-3" />
                        Emailed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <MailX className="mr-1 h-3 w-3" />
                        Not sent
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{announcement.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">{formatDate(announcement.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
