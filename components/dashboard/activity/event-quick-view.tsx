"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Camera, Clock, Cpu, ExternalLink, HardDrive, ImageOff, Send, ShieldAlert, Sparkles } from "lucide-react";
import { InfoTip } from "@/components/dashboard/analytics/viz";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventDetailsAction } from "@/lib/actions/event.actions";
import type { CameraEventDetail } from "@/lib/types";
import { AiAnalysisSections, ManualReviewDialog, describeEventDecision } from "./review-parts";
import { EventStatusBadge, ThreatBadge, formatEventTime } from "./event-badges";

// Detail responses carry 1-hour signed media URLs; reuse them briefly so J/K back-and-forth is instant.
const DETAIL_TTL_MS = 5 * 60 * 1000;
const detailCache = new Map<string, { at: number; data: CameraEventDetail }>();

async function loadDetail(id: string, fresh = false): Promise<CameraEventDetail> {
  const hit = detailCache.get(id);
  if (!fresh && hit && Date.now() - hit.at < DETAIL_TTL_MS) return hit.data;
  const res = await getEventDetailsAction(id);
  if (!res.success || !res.data) throw new Error(res.error || "Event not found");
  detailCache.set(id, { at: Date.now(), data: res.data });
  return res.data;
}

/** Warm the cache for the event the operator will most likely open next. */
export function prefetchEventDetail(id: string | undefined) {
  if (!id) return;
  const hit = detailCache.get(id);
  if (hit && Date.now() - hit.at < DETAIL_TTL_MS) return;
  loadDetail(id).catch(() => {});
}

function pickMedia(e: CameraEventDetail): { type: "video" | "image"; url: string } | null {
  const video = e.videos?.find((v) => v.isRecorded && (v.playbackUrl || v.clipUrl));
  const videoUrl = video?.playbackUrl || video?.clipUrl;
  if (videoUrl) return { type: "video", url: videoUrl };
  const thumb = e.thumbnails?.find((t) => t.isPrimary) ?? e.thumbnails?.[0] ?? e.cover_thumbnail;
  const url = thumb?.viewUrl || thumb?.thumbnailUrl;
  return url ? { type: "image", url } : null;
}

export function EventQuickView({
  eventId,
  reviewOpen,
  onReviewOpenChange,
  onReviewed,
}: {
  eventId: string;
  /** Owned by the page so its "R" shortcut can open the review dialog. */
  reviewOpen: boolean;
  onReviewOpenChange: (open: boolean) => void;
  onReviewed: (event: CameraEventDetail) => void;
}) {
  const [state, setState] = React.useState<{ id: string; data?: CameraEventDetail; error?: string } | null>(null);
  const [failedMediaUrl, setFailedMediaUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadDetail(eventId)
      .then((data) => !cancelled && setState({ id: eventId, data }))
      .catch((err: Error) => !cancelled && setState({ id: eventId, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const event = state?.id === eventId ? state.data : undefined;
  const error = state?.id === eventId ? state.error : undefined;

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-foreground">Couldn&apos;t load this event</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const media = pickMedia(event);
  const mediaFailed = media !== null && failedMediaUrl === media.url;
  const decision = describeEventDecision(event);
  const created = event.createdAt;

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-foreground">{event.edgeLabel} detection</h2>
            <ThreatBadge level={event.threatLevel} />
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-[11px] text-muted-foreground" title={new Date(created).toLocaleString()}>
            {formatEventTime(created)} · <span className="font-mono">{event.id}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onReviewOpenChange(true)}>
            <ShieldAlert className="size-3.5" />
            Review manually
            <kbd className="ml-0.5 rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">R</kbd>
          </Button>
          <Link
            href={`/dashboard/activity/${encodeURIComponent(event.id)}`}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border/60 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Open full page (Enter)"
          >
            <ExternalLink className="size-3.5" />
            Open
          </Link>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="overflow-hidden rounded-lg border border-border/50 bg-zinc-950">
          {media && !mediaFailed ? (
            media.type === "video" ? (
              <video
                key={media.url}
                src={media.url}
                controls
                autoPlay
                muted
                playsInline
                className="aspect-video w-full bg-black object-contain"
                onError={() => setFailedMediaUrl(media.url)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not optimizable
              <img
                src={media.url}
                alt={`${event.edgeLabel} snapshot`}
                className="aspect-video w-full object-contain"
                onError={() => setFailedMediaUrl(media.url)}
              />
            )
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-1.5 text-xs text-zinc-400">
              <ImageOff className="size-5" />
              {media ? "Media could not be loaded" : "No snapshot or clip uploaded yet"}
            </div>
          )}
        </div>

        <DetectionSummary event={event} />

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            {decision.title}
          </span>
          {decision.detail && <p className="text-xs leading-relaxed text-muted-foreground">{decision.detail}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          <Meta icon={Building2} label="Customer">
            {event.account ? (
              <Link href={`/dashboard/customers/${event.account.id}`} className="hover:text-primary hover:underline">
                {event.account.name}
              </Link>
            ) : (
              "—"
            )}
          </Meta>
          <Meta icon={HardDrive} label="Device">
            <Link
              href={`/dashboard/devices/${encodeURIComponent(event.deviceId)}`}
              className="font-mono hover:text-primary hover:underline"
            >
              {event.deviceId}
            </Link>
          </Meta>
          <Meta icon={Camera} label="Camera">
            {event.camera?.name || `Channel ${event.channelNumber ?? "?"}`}
          </Meta>
          <Meta icon={Clock} label="Detected">
            {new Date(created).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}
          </Meta>
          <Meta icon={Send} label="Customer alert">
            {event.alertDispatchedAt
              ? `Sent ${new Date(event.alertDispatchedAt).toLocaleTimeString("en-IN", { timeStyle: "medium" })}`
              : "Not sent"}
          </Meta>
        </dl>

        <div className="space-y-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AI analysis</h3>
          <AiAnalysisSections event={event} />
        </div>
      </div>

      <ManualReviewDialog
        event={event}
        open={reviewOpen}
        onOpenChange={onReviewOpenChange}
        onDone={async () => {
          try {
            const fresh = await loadDetail(event.id, true);
            setState({ id: event.id, data: fresh });
            onReviewed(fresh);
          } catch {
            // The review itself succeeded; the list refreshes on its next poll.
          }
        }}
      />
    </div>
  );
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

/** What the edge box flagged (label + confidence) next to what the cloud AI recognised in the media. */
export function DetectionSummary({ event, bare = false }: { event: CameraEventDetail; bare?: boolean }) {
  const confidence =
    event.edgeConfidence !== null && event.edgeConfidence !== undefined ? Math.round(event.edgeConfidence * 100) : null;
  const media = [...(event.thumbnails ?? []), ...(event.videos ?? [])];
  const analysed = media.filter((m) => m.aiStatus === "COMPLETED");
  const objects = Array.from(new Set(analysed.flatMap((m) => m.detectedObjects ?? []).map((o) => o.trim()).filter(Boolean)));
  const waiting = media.some((m) => m.aiStatus === "PENDING" || m.aiStatus === "ANALYZING");

  const rows = (
      <div className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-2 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Cpu className="size-3.5" />
          Edge box
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{titleCase(event.edgeLabel || "Unknown")}</span>
          {confidence !== null && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${confidence}%` }} />
              </span>
              {confidence}% confident
            </span>
          )}
        </span>

        <span className="flex items-center gap-1 text-muted-foreground">
          <Sparkles className="size-3.5" />
          Cloud AI
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {objects.length > 0 ? (
            objects.map((o) => (
              <span key={o} className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {o}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">
              {waiting
                ? "Still analysing…"
                : analysed.length > 0
                  ? "No objects found"
                  : media.length > 0
                    ? "Not analysed"
                    : "No snapshot or clip yet"}
            </span>
          )}
        </span>
      </div>
  );
  if (bare) return rows;

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        What was detected
        <InfoTip label="What was detected">{DETECTION_INFO}</InfoTip>
      </div>
      {rows}
    </div>
  );
}

export const DETECTION_INFO =
  "Detection happens in two steps. The edge box at the site spots something first and says how sure it is. Our cloud AI then looks at the snapshot and clips and lists what it actually sees.";

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-foreground/90">{children}</dd>
    </div>
  );
}
