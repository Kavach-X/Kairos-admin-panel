"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getEventsAction } from "@/lib/actions/event.actions";
import type { CameraEventDetail, CameraEventItem } from "@/lib/types";
import { useNow } from "@/components/dashboard/use-now";
import { CardShell } from "@/components/dashboard/analytics/viz";
import { EventStatusBadge, ThreatBadge } from "./event-badges";

const NEARBY_WINDOW_MS = 2 * 60 * 60 * 1000;

/** "+40s", "+2m 5s", "+1h 3m" after the detection. */
function offset(fromIso: string, toIso: string) {
  const sec = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000));
  if (sec < 60) return `+${sec}s`;
  if (sec < 3600) return `+${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `+${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

interface Step {
  label: string;
  at: string | null;
  /** Shown instead of a time when the step has not happened. */
  pending: string;
  detail?: string;
}

/** What happened to this event, in order, with how long after the detection each step came. */
export function EventTimeline({ event }: { event: CameraEventDetail }) {
  const now = useNow();
  const thumb = event.thumbnails?.find((t) => t.isPrimary) ?? event.thumbnails?.[0];
  const clips = (event.videos ?? []).filter((v) => v.isRecorded);
  const analysedClips = clips.filter((v) => v.aiAnalyzedAt);
  const lastClipAt = analysedClips.reduce<string | null>((a, v) => (!a || v.aiAnalyzedAt! > a ? v.aiAnalyzedAt! : a), null);

  const steps: Step[] = [
    { label: "Detected by edge box", at: event.createdAt, pending: "" },
    {
      label: "Snapshot checked by AI",
      at: thumb?.aiAnalyzedAt ?? null,
      pending: !thumb ? "No snapshot" : thumb.aiStatus === "FAILED" ? "AI failed" : "Waiting",
    },
    {
      label: clips.length > 1 ? `Clips checked by AI (${analysedClips.length}/${clips.length})` : "Clip checked by AI",
      at: lastClipAt,
      pending: clips.length === 0 ? "No clip" : "Waiting",
    },
    {
      label: "Customer alerted",
      at: event.alertDispatchedAt,
      pending: "Not sent",
      detail: event.alertChannels?.length ? `via ${event.alertChannels.map((c) => c.toLowerCase()).join(", ")}` : undefined,
    },
    { label: "Reviewed by operator", at: event.reviewedAt ?? null, pending: "Not reviewed" },
  ];

  return (
    <CardShell
      title="Timeline"
      info="Each step this event went through, with how long after the detection it happened. Grey steps have not happened (yet)."
    >
      <ol className="space-y-3 text-xs">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-2.5">
            {s.at ? (
              <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="mt-px size-3.5 shrink-0 text-muted-foreground/40" />
            )}
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
              <span className={s.at ? "text-foreground" : "text-muted-foreground"}>
                {s.label}
                {s.at && s.detail && <span className="text-muted-foreground"> {s.detail}</span>}
              </span>
              <span className="shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                {s.at ? (
                  now === null ? (
                    ""
                  ) : s.at === event.createdAt ? (
                    clock(s.at)
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">{offset(event.createdAt, s.at)}</span> · {clock(s.at)}
                    </>
                  )
                ) : (
                  <span className="font-sans">{s.pending}</span>
                )}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </CardShell>
  );
}

/** Other events from the same device within ±2 hours: bursts usually mean one incident or one noisy camera. */
export function NearbyEvents({ event }: { event: CameraEventDetail }) {
  const now = useNow();
  const [state, setState] = React.useState<{ id: string; items?: CameraEventItem[]; error?: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const t = new Date(event.createdAt).getTime();
    getEventsAction({
      deviceId: event.deviceId,
      startDate: new Date(t - NEARBY_WINDOW_MS).toISOString(),
      endDate: new Date(t + NEARBY_WINDOW_MS).toISOString(),
      limit: 30,
    }).then((res) => {
      if (cancelled) return;
      setState(res.success && res.data ? { id: event.id, items: res.data.items } : { id: event.id, error: res.error || "Failed to load" });
    });
    return () => {
      cancelled = true;
    };
  }, [event.id, event.deviceId, event.createdAt]);

  const current = state?.id === event.id ? state : null;
  const others = (current?.items ?? []).filter((e) => e.id !== event.id);

  return (
    <CardShell
      title="Nearby events"
      subtitle="Same device, within 2 hours"
      info="Other events from the same device within two hours before or after this one. Many events close together usually means one ongoing incident, or a camera that keeps triggering by mistake."
      action={current?.items ? <span className="font-mono text-[11px] text-muted-foreground">{others.length}</span> : undefined}
      flush
    >
      <div className="p-2 text-xs">
        {!current ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
          </div>
        ) : current.error ? (
          <p className="px-2 py-2 text-muted-foreground">Couldn&apos;t load: {current.error}</p>
        ) : others.length === 0 ? (
          <p className="px-2 py-2 text-muted-foreground">No other events from this device within 2 hours.</p>
        ) : (
          <ul className="max-h-72 space-y-0.5 overflow-y-auto overscroll-contain">
            {others.map((e) => {
              const diffMin = Math.round((new Date(e.createdAt).getTime() - new Date(event.createdAt).getTime()) / 60000);
              const when = diffMin === 0 ? "same minute" : `${Math.abs(diffMin)} min ${diffMin < 0 ? "before" : "after"}`;
              return (
                <li key={e.id}>
                  <Link
                    href={`/dashboard/activity/${encodeURIComponent(e.id)}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                  >
                    <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{now === null ? "" : when}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {e.edgeLabel}
                      {e.camera?.name && <span className="text-muted-foreground"> · {e.camera.name}</span>}
                    </span>
                    <ThreatBadge level={e.threatLevel} />
                    <EventStatusBadge status={e.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CardShell>
  );
}
