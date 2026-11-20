"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, Camera, Check, Clock, Copy, HardDrive, Maximize2, Play, RefreshCw, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEventDetailsAction } from "@/lib/actions/event.actions";
import type { CameraEventDetail } from "@/lib/types";
import { CardShell } from "@/components/dashboard/analytics/viz";
import { DetailHeader, Facts, SURFACE } from "@/components/dashboard/detail-header";
import { AiAnalysisSections, ManualReviewDialog, describeEventDecision } from "./review-parts";
import { DETECTION_INFO, DetectionSummary } from "./event-quick-view";
import { EventTimeline } from "./event-context";
import { EventStatusBadge, ThreatBadge } from "./event-badges";

// Fixed locale and zone so the server render and the browser agree.
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const titleCase = (s: string) => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface MediaItem {
  key: string;
  kind: "image" | "video";
  url: string;
  label: string;
  /** Snapshot shown in the strip (clips use a play tile). */
  thumb?: string;
}

/** Snapshots first (primary on top), then clips in order. */
function mediaOf(event: CameraEventDetail): MediaItem[] {
  const thumbs = event.thumbnails?.length ? event.thumbnails : event.cover_thumbnail ? [event.cover_thumbnail] : [];
  const images = [...thumbs]
    .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary))
    .flatMap((t, i): MediaItem[] => {
      const url = t.viewUrl || t.thumbnailUrl || t.view_url || t.thumbnail_url;
      return url ? [{ key: t.id || `t${i}`, kind: "image", url, thumb: url, label: thumbs.length > 1 ? `Snapshot ${i + 1}` : "Snapshot" }] : [];
    });
  const videos = [...(event.videos ?? [])]
    .sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))
    .flatMap((v, i): MediaItem[] => {
      const url = v.playbackUrl || v.clipUrl;
      const secs = v.durationSeconds ? ` · ${v.durationSeconds}s` : "";
      return url ? [{ key: v.id || `v${i}`, kind: "video", url, label: `${(event.videos?.length ?? 0) > 1 ? `Clip ${i + 1}` : "Clip"}${secs}` }] : [];
    });
  return [...images, ...videos];
}

/** The clip is the best evidence when there is one; otherwise the primary snapshot. */
const defaultMedia = (items: MediaItem[]) => items.find((m) => m.kind === "video") ?? items[0] ?? null;

export interface EventDetailInitial {
  event: CameraEventDetail | null;
  error: string | null;
}

export function EventDetailClient({ initial }: { initial: EventDetailInitial }) {
  const [event, setEvent] = React.useState<CameraEventDetail | null>(initial.event);
  const [error, setError] = React.useState<string | null>(initial.error);
  const [refreshing, setRefreshing] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState<Set<string>>(() => new Set());
  const [enlarged, setEnlarged] = React.useState<string | null>(null);

  // Refresh keeps the page in place: the button spins, the content swaps when the new data lands.
  const refresh = React.useCallback(async () => {
    if (!event) return;
    setRefreshing(true);
    const res = await getEventDetailsAction(event.id);
    if (res.success && res.data) {
      setEvent(res.data);
      setError(null);
      // Signed media URLs change on every fetch.
      setFailed(new Set());
    } else {
      toast.error(res.error || "Couldn't refresh this event");
    }
    setRefreshing(false);
  }, [event]);

  React.useEffect(() => {
    if (!enlarged) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEnlarged(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enlarged]);

  if (error || !event) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="mb-3 size-8 text-amber-500" />
        <h2 className="text-base font-semibold text-foreground">Event not found</h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">{error || "This event could not be loaded."}</p>
        <Link href="/dashboard/activity" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <ArrowLeft className="size-3.5" />
          Back to events
        </Link>
      </div>
    );
  }

  const media = mediaOf(event).filter((m) => !failed.has(m.url));
  const active = media.find((m) => m.key === activeKey) ?? defaultMedia(media);
  const markFailed = (url: string) => setFailed((prev) => new Set(prev).add(url));

  const aiFailed = [...(event.thumbnails ?? []), ...(event.videos ?? [])].some((m) => m.aiStatus === "FAILED");
  const decision = describeEventDecision(event);
  const cameraName = event.camera?.name || `Channel ${event.channelNumber ?? "?"}`;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(event.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to the clipboard");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DetailHeader
        back={{ href: "/dashboard/activity", label: "Events" }}
        title={titleCase(event.edgeLabel || "Detection")}
        badges={
          <>
            <ThreatBadge level={event.threatLevel} />
            <EventStatusBadge status={event.status} />
            {aiFailed && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                AI failed
              </Badge>
            )}
          </>
        }
        meta={[
          <>
            <Clock className="size-3" />
            <span suppressHydrationWarning>{DATE_TIME.format(new Date(event.createdAt))}</span>
          </>,
          event.account?.name && (
            <>
              <Building2 className="size-3" />
              {event.businessAccountId ? (
                <Link href={`/dashboard/customers/${event.businessAccountId}`} className="hover:text-foreground hover:underline">
                  {event.account.name}
                </Link>
              ) : (
                event.account.name
              )}
            </>
          ),
          <>
            <Camera className="size-3" />
            {cameraName}
          </>,
          event.deviceId && (
            <>
              <HardDrive className="size-3" />
              <Link href={`/dashboard/devices/${encodeURIComponent(event.deviceId)}`} className="font-mono hover:text-foreground hover:underline">
                {event.deviceId}
              </Link>
            </>
          ),
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={copyId}>
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              Copy ID
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Media: the player and every snapshot / clip in one card */}
          <div className={`${SURFACE} overflow-hidden`}>
            <div className="group relative flex aspect-video items-center justify-center bg-black">
              {!active ? (
                <div className="flex flex-col items-center gap-2 px-6 text-center text-zinc-500">
                  <Camera className="size-8 stroke-1" />
                  <p className="text-xs">No snapshot or clip was uploaded for this event.</p>
                </div>
              ) : active.kind === "video" ? (
                <video
                  key={active.url}
                  src={active.url}
                  controls
                  muted
                  playsInline
                  onError={() => markFailed(active.url)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not optimizable */}
                  <img src={active.url} alt={event.edgeLabel} onError={() => markFailed(active.url)} className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setEnlarged(active.url)}
                    aria-label="View full size"
                    className="absolute right-3 top-3 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Maximize2 className="size-4" />
                  </button>
                </>
              )}
            </div>

            {media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-border/40 p-2">
                {media.map((m) => {
                  const selected = m.key === active?.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setActiveKey(m.key)}
                      aria-pressed={selected}
                      title={m.label}
                      className={cn(
                        "relative h-12 w-20 shrink-0 overflow-hidden rounded-md border bg-zinc-950 transition-colors",
                        selected ? "border-primary ring-2 ring-primary/30" : "border-border/60 hover:border-foreground/30"
                      )}
                    >
                      {m.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not optimizable
                        <img src={m.thumb} alt="" onError={() => markFailed(m.url)} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-zinc-400">
                          <Play className="size-4" />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 text-[9px] leading-4 text-white">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <CardShell
            title="AI analysis"
            info="What our cloud AI concluded for each snapshot and clip of this event, in its own words."
          >
            <div className="space-y-3">
              <AiAnalysisSections event={event} />
              {event.falseAlarmReason && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                  <AlertTriangle className="mt-px size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-foreground">Why it was marked a false alarm</p>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">{event.falseAlarmReason}</p>
                  </div>
                </div>
              )}
            </div>
          </CardShell>
        </div>

        <div className="flex flex-col gap-4">
          <CardShell title="Decision">
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium text-foreground">{decision.title}</p>
                {decision.detail && <p className="mt-0.5 leading-relaxed text-muted-foreground">{decision.detail}</p>}
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setReviewOpen(true)}>
                <ShieldAlert className="size-3.5" />
                Review manually
              </Button>
              <ManualReviewDialog event={event} open={reviewOpen} onOpenChange={setReviewOpen} onDone={refresh} />
            </div>
          </CardShell>

          <CardShell title="What was detected" info={DETECTION_INFO}>
            <DetectionSummary event={event} bare />
          </CardShell>

          <CardShell title="Source">
            <Facts
              items={[
                {
                  label: "Customer",
                  value: event.businessAccountId ? (
                    <Link href={`/dashboard/customers/${event.businessAccountId}`} className="hover:text-primary hover:underline">
                      {event.account?.name || "Open customer"}
                    </Link>
                  ) : (
                    event.account?.name
                  ),
                },
                {
                  label: "Device",
                  mono: true,
                  value: event.deviceId && (
                    <Link href={`/dashboard/devices/${encodeURIComponent(event.deviceId)}`} className="hover:text-primary hover:underline">
                      {event.deviceId}
                    </Link>
                  ),
                },
                { label: "Model", value: event.device?.modelCode },
                { label: "Camera", value: event.camera?.name },
                { label: "Channel", value: event.channelNumber ?? null, mono: true },
                { label: "Event ID", value: <span title={event.id}>{event.id}</span>, mono: true },
              ]}
            />
          </CardShell>

          <EventTimeline event={event} />
        </div>
      </div>

      {enlarged && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Snapshot, full size"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setEnlarged(null)}
        >
          <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-md p-1.5 text-zinc-300 hover:text-white">
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not optimizable */}
          <img src={enlarged} alt="" className="max-h-[90vh] max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
