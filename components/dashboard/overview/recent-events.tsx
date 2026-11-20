import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getOverviewRecentEvents } from "@/lib/data/overview-data";
import { CardShell } from "@/components/dashboard/analytics/viz";
import { EventRows } from "./event-rows";

/** The latest detections with their snapshot, verdict and where they came from. */
export async function RecentEvents() {
  const res = await getOverviewRecentEvents();
  const events = res.data?.items ?? [];

  return (
    <CardShell
      title="Latest events"
      subtitle="Newest camera detections and how the AI handled them"
      flush
      info="The most recent things the cameras noticed. The badges show how serious it looked and what happened to it (confirmed, false alarm, or still being checked). Click one to open it."
      action={
        <Link href="/dashboard/activity" className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
          All events
          <ArrowUpRight className="size-3" />
        </Link>
      }
    >
      {!res.success ? (
        <p className="p-4 text-xs text-muted-foreground">Couldn&apos;t load events: {res.error}</p>
      ) : events.length === 0 ? (
        <p className="p-4 text-xs text-muted-foreground">No events yet. Camera detections will appear here.</p>
      ) : (
        <EventRows events={events} />
      )}
    </CardShell>
  );
}
