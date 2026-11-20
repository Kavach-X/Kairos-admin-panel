/* eslint-disable @typescript-eslint/no-explicit-any -- list rows arrive in mixed camelCase/snake_case shapes */
import Link from "next/link";
import { Building2, Camera, HardDrive, Video } from "lucide-react";
import { EventStatusBadge, ThreatBadge } from "@/components/dashboard/activity/event-badges";
import type { CameraEventItem } from "@/lib/types";
import { TimeAgo } from "./time-ago";

/** Event list rows (snapshot, label, verdict, customer, device, time), used inside a CardShell. */
export function EventRows({ events, showCustomer = true }: { events: CameraEventItem[]; showCustomer?: boolean }) {
  return (
    <ul className="divide-y divide-border/40">
      {(events as any[]).map((ev) => {
        const thumb = ev.cover_thumbnail?.view_url || ev.cover_thumbnail?.thumbnailUrl;
        const hasClip = (ev.videoCount ?? ev.video_count ?? 0) > 0;
        return (
          <li key={ev.id}>
            <Link
              href={`/dashboard/activity/${encodeURIComponent(ev.id)}`}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
            >
              <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded border border-border/40 bg-muted/50">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not optimizable
                  <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/60" />
                )}
                {hasClip && <Video className="absolute bottom-0.5 right-0.5 size-3 rounded-sm bg-black/60 p-[1px] text-white" />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-foreground group-hover:text-primary">
                    {ev.edgeLabel || ev.edge_label || "Detection"}
                  </span>
                  <ThreatBadge level={ev.threatLevel || ev.threat_level} />
                  <EventStatusBadge status={ev.status} />
                </div>
                <div className="flex items-center gap-2 truncate text-[11px] text-muted-foreground">
                  {showCustomer ? (
                    <span className="flex min-w-0 items-center gap-1 truncate">
                      <Building2 className="size-3 shrink-0" />
                      <span className="truncate">{ev.account?.name || "—"}</span>
                    </span>
                  ) : (
                    <span className="flex min-w-0 items-center gap-1 truncate">
                      <Camera className="size-3 shrink-0" />
                      <span className="truncate">{ev.camera?.name || `Channel ${ev.channelNumber ?? ev.channel_number ?? "?"}`}</span>
                    </span>
                  )}
                  <span className="flex shrink-0 items-center gap-1 font-mono text-[10px]">
                    <HardDrive className="size-3" />
                    {ev.deviceId || ev.device_id}
                  </span>
                </div>
              </div>
              <TimeAgo iso={ev.createdAt || ev.created_at} className="shrink-0 text-[11px] text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
