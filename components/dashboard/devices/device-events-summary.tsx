"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getEventsAction, type EventStatusCounts } from "@/lib/actions/event.actions";
import type { CameraEventItem } from "@/lib/types";
import { CardShell } from "@/components/dashboard/analytics/viz";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TileRowSkeleton, PanelSkeleton } from "@/components/dashboard/page-skeletons";
import { EventRows } from "@/components/dashboard/overview/event-rows";

const DAYS = 30;

/**
 * High-level event summary for one device: last 30 days by outcome plus the latest events.
 * One request (list + per-status counts), made only when the Events tab is first opened.
 */
export function DeviceEventsSummary({ deviceId }: { deviceId: string }) {
  const [state, setState] = React.useState<{ counts: EventStatusCounts; items: CameraEventItem[] } | { error: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getEventsAction({
      deviceId,
      startDate: new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString(),
      limit: 5,
      includeCounts: true,
    }).then((res) => {
      if (cancelled) return;
      setState(
        res.success && res.data ? { counts: res.data.statusCounts ?? {}, items: res.data.items } : { error: res.error || "Couldn't load events" }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const eventsHref = `/dashboard/activity?device=${encodeURIComponent(deviceId)}`;
  const viewAll = (
    <Link href={eventsHref} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
      View all events
      <ArrowUpRight className="size-3" />
    </Link>
  );

  if (state === null) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <TileRowSkeleton />
        <PanelSkeleton lines={4} />
      </div>
    );
  }
  if ("error" in state) {
    return <p className="text-xs text-muted-foreground">Couldn&apos;t load events: {state.error}</p>;
  }

  const c = state.counts;
  const confirmed = c.CONFIRMED_ALERT ?? 0;
  const falseAlarms = (c.DISCARDED_FALSE_ALARM ?? 0) + (c.DISMISSED_BY_USER ?? 0);
  const pending = (c.PENDING_UPLOAD ?? 0) + (c.RECORDED ?? 0) + (c.PROCESSING_AI ?? 0);
  const total = confirmed + falseAlarms + pending;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={`Events, last ${DAYS} days`} value={total.toLocaleString("en-IN")} info="Everything this device's cameras flagged in the last 30 days." />
        <StatTile
          label="Confirmed threats"
          swatch="var(--viz-confirmed)"
          value={confirmed.toLocaleString("en-IN")}
          info="Events confirmed as real, by our AI or by an operator. The customer was alerted."
        />
        <StatTile
          label="False alarms"
          swatch="var(--viz-false-alarm)"
          value={falseAlarms.toLocaleString("en-IN")}
          note={total > 0 ? `${Math.round((falseAlarms / total) * 100)}%` : undefined}
          info="Events the AI or an operator found were not real. A high share can mean a camera needs re-aiming or cleaning."
        />
        <StatTile
          label="Still being checked"
          swatch="var(--viz-pending)"
          value={pending.toLocaleString("en-IN")}
          info="Events still uploading or waiting for the AI's answer."
        />
      </div>

      <CardShell title="Latest events" action={viewAll} flush>
        {state.items.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">No events from this device in the last {DAYS} days.</p>
        ) : (
          <EventRows events={state.items} showCustomer={false} />
        )}
      </CardShell>
    </div>
  );
}
