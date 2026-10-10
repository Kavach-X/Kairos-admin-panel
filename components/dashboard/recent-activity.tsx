import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { getEventsAction } from "@/lib/actions/event.actions";
import type { EventThreatLevel } from "@/lib/types";

const threatTagMap: Record<
  EventThreatLevel,
  { label: string; className: string }
> = {
  CRITICAL: {
    label: "CRITICAL",
    className: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  HIGH: {
    label: "HIGH ALERT",
    className: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  MEDIUM: {
    label: "ALERT",
    className: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  LOW: {
    label: "INFO",
    className: "text-muted-foreground bg-muted/60 border-border/50",
  },
  NONE: {
    label: "ROUTINE",
    className: "text-muted-foreground bg-muted/60 border-border/50",
  },
};

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export async function RecentActivity() {
  const eventsRes = await getEventsAction({ limit: 6 });
  const events =
    eventsRes.success && eventsRes.data?.items ? eventsRes.data.items : [];

  return (
    <Card className="border-border/50 bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3 pt-4 px-4">
        <div>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Events
          </CardTitle>
        </div>
        <Link
          href="/dashboard/activity"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>View all</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <p className="text-xs font-medium text-foreground">
              No recent events recorded
            </p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Live camera detections will appear here automatically
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {events.map((act) => {
              const tLevel = (act.threatLevel ||
                (act as any).threat_level ||
                "NONE") as EventThreatLevel;
              const tagConfig = threatTagMap[tLevel] || threatTagMap.NONE;
              const customerName =
                act.account?.name || (act as any).account_name || "Direct Customer";
              const channelNum =
                act.channelNumber ?? (act as any).channel_number ?? 1;
              const cameraName = act.camera?.name || `Camera #${channelNum}`;
              const devId = act.deviceId || (act as any).device_id || "";
              const eLabel =
                act.edgeLabel || (act as any).edge_label || "Detection";
              const cAt = act.createdAt || (act as any).created_at;

              return (
                <Link
                  key={act.id}
                  href={`/dashboard/activity/${act.id}`}
                  className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                        {eLabel}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.2 font-mono text-[10px] font-medium tracking-wide ${tagConfig.className}`}
                      >
                        {tagConfig.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {customerName} • {cameraName}
                      {devId && (
                        <>
                          {" "}
                          •{" "}
                          <span className="font-mono text-foreground/80">
                            {devId}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatTimeAgo(cAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
