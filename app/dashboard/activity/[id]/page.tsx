"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  HardDrive,
  Camera,
  Video,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Bell,
  Sparkles,
  Loader2,
  RefreshCw,
  Cpu,
  Mail,
  Maximize2,
  X,
  Play,
  Layers,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getEventDetailsAction,
  reviewEventAction,
} from "@/lib/actions/event.actions";
import type { CameraEventDetail, EventThreatLevel } from "@/lib/types";

const threatBadges: Record<
  EventThreatLevel,
  { label: string; bg: string; dot: string; border: string }
> = {
  CRITICAL: {
    label: "Critical Threat",
    bg: "bg-red-500/10 text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  HIGH: {
    label: "High Alert",
    bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
  },
  MEDIUM: {
    label: "Medium Priority",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low Priority",
    bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  NONE: {
    label: "Routine Telemetry",
    bg: "bg-muted text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
};

const statusColors: Record<string, string> = {
  CONFIRMED_ALERT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  DISMISSED_BY_USER: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  DISCARDED_FALSE_ALARM: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PROCESSING_AI: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  RECORDED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PENDING_UPLOAD: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = React.useState<CameraEventDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewing, setReviewing] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState(false);
  const [dismissReason, setDismissReason] = React.useState("");
  const [showDismissInput, setShowDismissInput] = React.useState(false);

  // Active preview selection (null = default to primary video/thumbnail)
  const [activeMediaUrl, setActiveMediaUrl] = React.useState<string | null>(null);
  const [activeMediaType, setActiveMediaType] = React.useState<"video" | "image">("video");
  const [enlargedImage, setEnlargedImage] = React.useState<string | null>(null);
  const [failedImageUrls, setFailedImageUrls] = React.useState<Set<string>>(new Set());

  const fetchEvent = React.useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    const res = await getEventDetailsAction(eventId);
    if (res.success && res.data) {
      setEvent(res.data);
      // Initialize active media: prioritize video
      const primaryVideo = res.data.videos?.find((v: any) => v.clipUrl || v.playbackUrl) || res.data.videos?.[0];
      const videoUrl = primaryVideo?.playbackUrl || primaryVideo?.clipUrl;
      const primaryThumb =
        res.data.thumbnails?.find((t) => t.isPrimary && (t.viewUrl || t.thumbnailUrl)) ||
        res.data.thumbnails?.find((t) => t.viewUrl || t.thumbnailUrl) ||
        (res.data.cover_thumbnail?.viewUrl || res.data.cover_thumbnail?.thumbnailUrl ? res.data.cover_thumbnail : null);
      const thumbUrl = primaryThumb?.viewUrl || primaryThumb?.thumbnailUrl;

      if (videoUrl) {
        setActiveMediaUrl(videoUrl);
        setActiveMediaType("video");
      } else if (thumbUrl) {
        setActiveMediaUrl(thumbUrl);
        setActiveMediaType("image");
      } else {
        setActiveMediaUrl(null);
      }
    } else {
      setError(res.error || "Event telemetry record not found");
    }
    setLoading(false);
  }, [eventId]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [eventId]);

  React.useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [loading]);

  React.useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleCopyId = () => {
    if (!eventId) return;
    navigator.clipboard.writeText(eventId);
    setCopiedId(true);
    toast.success("Event ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleReview = async (reviewStatus: "CONFIRMED_ALERT" | "DISMISSED_BY_USER") => {
    if (!eventId) return;
    setReviewing(reviewStatus);
    try {
      const res = await reviewEventAction(eventId, {
        status: reviewStatus,
        falseAlarmReason:
          reviewStatus === "DISMISSED_BY_USER"
            ? (dismissReason.trim() || "Dismissed as false alarm from Security Operator Console")
            : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update review status");
        return;
      }

      toast.success(
        reviewStatus === "CONFIRMED_ALERT"
          ? "Event confirmed as active security threat"
          : "Event dismissed as false alarm"
      );
      setShowDismissInput(false);
      setDismissReason("");
      fetchEvent();
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setReviewing(null);
    }
  };

  // High-fidelity zero-layout-shift Skeleton Loader
  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12 animate-pulse">
        {/* Top bar skeleton */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Player container skeleton */}
            <div className="rounded-xl border border-border/70 bg-zinc-950 aspect-video flex flex-col justify-between p-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-36 bg-zinc-800 rounded" />
                <Skeleton className="h-4 w-24 bg-zinc-800 rounded" />
              </div>
              <div className="self-center">
                <Skeleton className="size-16 rounded-full bg-zinc-800/60" />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                <Skeleton className="h-4 w-48 bg-zinc-800 rounded" />
                <Skeleton className="h-4 w-28 bg-zinc-800 rounded" />
              </div>
            </div>

            {/* Keyframes Thumbnails Gallery strip skeleton */}
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-32 rounded-lg shrink-0" />
                ))}
              </div>
            </div>

            {/* Cloud AI Verdict Card skeleton */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            </div>
          </div>

          {/* Right Column skeleton */}
          <div className="space-y-6">
            {/* Triage action card skeleton */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full rounded-md" />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>

            {/* Hardware EdgeBox card skeleton */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full rounded-md mt-2" />
            </div>

            {/* Alert channels skeleton */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>

            {/* Timestamps skeleton */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-lg mx-auto">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-foreground">Event Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">{error || "Unable to retrieve event telemetry."}</p>
        <Link
          href="/dashboard/activity"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Events
        </Link>
      </div>
    );
  }

  const threatInfo = threatBadges[event.threatLevel] || threatBadges.NONE;
  const primaryVideo = event.videos?.find((v: any) => v.clipUrl || v.playbackUrl) || event.videos?.[0];
  const videoPlaybackUrl = primaryVideo?.playbackUrl || primaryVideo?.clipUrl;
  const primaryThumbnail =
    event.thumbnails?.find((t) => t.isPrimary && (t.viewUrl || t.thumbnailUrl)) ||
    event.thumbnails?.find((t) => t.viewUrl || t.thumbnailUrl) ||
    event.cover_thumbnail;

  const allThumbnails = event.thumbnails && event.thumbnails.length > 0
    ? event.thumbnails
    : event.cover_thumbnail
    ? [event.cover_thumbnail]
    : [];

  const validThumbnails = allThumbnails.filter((t) => {
    const url = t.viewUrl || t.thumbnailUrl || t.view_url || t.thumbnail_url;
    return Boolean(url && !failedImageUrls.has(url));
  });

  const customerName = event.account?.name || "Direct Customer Site";
  const cameraName = event.camera?.name || `Camera #${event.channelNumber || 1}`;

  // Cloud AI evaluation determination
  const isActivelyAnalyzing =
    event.status === "PROCESSING_AI" ||
    primaryVideo?.aiStatus === "ANALYZING" ||
    primaryThumbnail?.aiStatus === "ANALYZING";

  const isFailed =
    primaryVideo?.aiStatus === "FAILED" ||
    primaryThumbnail?.aiStatus === "FAILED";

  const hasCloudAiAnalysis =
    Boolean(primaryThumbnail?.aiSummary) ||
    Boolean(primaryVideo?.aiSummary) ||
    event.status === "CONFIRMED_ALERT" ||
    event.status === "DISCARDED_FALSE_ALARM";

  const aiSummary =
    primaryThumbnail?.aiSummary ||
    primaryVideo?.aiSummary ||
    null;

  const detectedObjects =
    primaryThumbnail?.detectedObjects ||
    primaryVideo?.detectedObjects ||
    [];

  // Email Notification Variation classification based on alert threat level
  const emailVariation =
    event.threatLevel === "CRITICAL" || event.threatLevel === "HIGH"
      ? {
          name: "Critical Security Threat Template",
          desc: "High-priority SMS & immediate dispatch with keyframe thumbnail attachment.",
          badge: "Urgent Escalation",
          badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/30",
        }
      : event.threatLevel === "MEDIUM" || event.threatLevel === "LOW"
      ? {
          name: "Standard Perimeter Incident Template",
          desc: "Routine notification digest sent to registered site managers.",
          badge: "Informational",
          badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        }
      : {
          name: "Routine Activity Log Template",
          desc: "Aggregated daily summary without emergency broadcast.",
          badge: "Digest",
          badgeColor: "bg-zinc-500/10 text-zinc-600 border-zinc-500/30",
        };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/activity"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Events
          </Link>

          <span className="text-muted-foreground/40">/</span>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${threatInfo.bg} ${threatInfo.border}`}>
              <span className={`size-1.5 rounded-full ${threatInfo.dot}`} />
              {threatInfo.label}
            </span>

            {isActivelyAnalyzing ? (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium">
                Pending Cloud
              </Badge>
            ) : isFailed ? (
              <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-medium flex items-center gap-1.5">
                <AlertTriangle className="size-3 text-rose-500" />
                AI Analysis Failed
              </Badge>
            ) : event.status === "RECORDED" ? (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium">
                Pending Cloud
              </Badge>
            ) : event.status === "PENDING_UPLOAD" ? (
              <Badge variant="outline" className="text-xs bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 font-medium">
                Pending Upload
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={`text-xs ${statusColors[event.status] || "border-border"}`}
              >
                {event.status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border/60 transition-colors"
            title="Copy Event ID"
          >
            {copiedId ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            <span>ID: {event.id.slice(0, 14)}...</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={fetchEvent}
          >
            <RefreshCw className="size-3" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Column = Forensic Visuals & Cloud AI, Right Column = Hardware EdgeBox & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visual Media Viewer */}
          <div className="rounded-xl border border-border/70 bg-black overflow-hidden shadow-sm flex flex-col justify-center min-h-[340px]">
            {activeMediaType === "video" && activeMediaUrl ? (
              <div className="w-full">
                <video
                  src={activeMediaUrl}
                  controls
                  muted
                  playsInline
                  className="w-full max-h-[460px] bg-black aspect-video object-contain"
                />
                <div className="flex items-center justify-between bg-zinc-950 px-4 py-2.5 text-xs text-zinc-400 border-t border-zinc-800">
                  <span className="flex items-center gap-2 font-medium text-emerald-400">
                    <Video className="size-4" />
                    Recorded Cloud Forensic Clip ({primaryVideo?.durationSeconds || event.totalDurationSeconds || 10}s)
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">Decoupled AI Chunk</span>
                </div>
              </div>
            ) : activeMediaType === "image" && activeMediaUrl && !failedImageUrls.has(activeMediaUrl) ? (
              <div className="relative group w-full">
                <img
                  src={activeMediaUrl}
                  alt={event.edgeLabel}
                  onError={() => {
                    setFailedImageUrls((prev) => {
                      const next = new Set(prev);
                      next.add(activeMediaUrl);
                      return next;
                    });
                    if (videoPlaybackUrl) {
                      setActiveMediaUrl(videoPlaybackUrl);
                      setActiveMediaType("video");
                    } else {
                      setActiveMediaUrl(null);
                    }
                  }}
                  className="w-full max-h-[460px] object-contain bg-black"
                />
                <button
                  type="button"
                  onClick={() => setEnlargedImage(activeMediaUrl)}
                  className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-1.5 rounded-md border border-white/20 transition-all opacity-80 group-hover:opacity-100"
                  title="Enlarge Keyframe"
                >
                  <Maximize2 className="size-4" />
                </button>
                <div className="flex items-center justify-between bg-zinc-950 px-4 py-2.5 text-xs text-zinc-400 border-t border-zinc-800">
                  <span className="flex items-center gap-2 font-medium text-amber-400">
                    <Camera className="size-4" />
                    Keyframe Snapshot Preview
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">Tier-1 Realtime Triage</span>
                </div>
              </div>
            ) : videoPlaybackUrl ? (
              <div className="w-full">
                <video
                  src={videoPlaybackUrl}
                  controls
                  muted
                  playsInline
                  className="w-full max-h-[460px] bg-black aspect-video object-contain"
                />
                <div className="flex items-center justify-between bg-zinc-950 px-4 py-2.5 text-xs text-zinc-400 border-t border-zinc-800">
                  <span className="flex items-center gap-2 font-medium text-emerald-400">
                    <Video className="size-4" />
                    Recorded Video Footage
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">Edge Chunk</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-14 text-center text-zinc-500">
                <Radio className="size-12 mb-3 stroke-1 text-zinc-600" />
                <h4 className="text-sm font-semibold text-zinc-300">Telemetry-Only Event</h4>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Registered via edge MQTT broker without recorded visual media chunk attached.
                </p>
              </div>
            )}
          </div>

          {/* Keyframe Snapshots & Thumbnails Gallery ("umbiles") */}
          {validThumbnails.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Keyframe Snapshots & Thumbnails ({validThumbnails.length})
                    </CardTitle>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Click to preview in player</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {validThumbnails.map((thumb, idx) => {
                    const thumbUrl = thumb.viewUrl || thumb.thumbnailUrl || thumb.view_url || thumb.thumbnail_url;
                    if (!thumbUrl) return null;
                    const isSelected = activeMediaUrl === thumbUrl && activeMediaType === "image";

                    return (
                      <div
                        key={thumb.id || idx}
                        onClick={() => {
                          setActiveMediaUrl(thumbUrl);
                          setActiveMediaType("image");
                        }}
                        className={cn(
                          "relative group cursor-pointer shrink-0 rounded-lg border overflow-hidden transition-all w-36 bg-zinc-950",
                          isSelected
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <img
                          src={thumbUrl}
                          alt={`Keyframe ${idx + 1}`}
                          onError={() => {
                            setFailedImageUrls((prev) => {
                              const next = new Set(prev);
                              next.add(thumbUrl);
                              return next;
                            });
                          }}
                          className="h-20 w-36 object-cover bg-black"
                        />
                        <div className="p-1.5 bg-card/95 text-[10px] flex items-center justify-between border-t border-border/40">
                          <span className="font-mono text-muted-foreground">
                            {thumb.isPrimary ? "★ Primary" : `Shot #${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEnlargedImage(thumbUrl);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                            title="Zoom"
                          >
                            <Maximize2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Switch back to video button if video exists */}
                  {primaryVideo && (primaryVideo.playbackUrl || primaryVideo.clipUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMediaUrl(primaryVideo.playbackUrl || primaryVideo.clipUrl || null);
                        setActiveMediaType("video");
                      }}
                      className={cn(
                        "relative cursor-pointer shrink-0 rounded-lg border border-dashed border-border hover:border-emerald-500/60 p-2 flex flex-col items-center justify-center gap-1.5 w-28 bg-muted/20 text-xs transition-all",
                        activeMediaType === "video" ? "border-emerald-500 text-emerald-500 bg-emerald-500/5" : "text-muted-foreground"
                      )}
                    >
                      <Play className="size-5" />
                      <span className="text-[11px] font-medium">Show Video</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tier 2: Ever Cloud AI Forensic Intelligence Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Ever Cloud AI Forensic Intelligence (Tier 2)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Deep vision reasoning, scene narrative & threat verdict
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className={`text-xs ${statusColors[event.status] || "border-border"}`}>
                  {event.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {hasCloudAiAnalysis && aiSummary ? (
                <>
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Cloud AI Forensic Narrative
                    </span>
                    <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/40">
                      {aiSummary}
                    </p>
                  </div>

                  {detectedObjects.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Recognized Entities & Classification Tags
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {detectedObjects.map((obj, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 font-medium text-xs text-primary"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : isActivelyAnalyzing ? (
                /* Cloud AI Analysis Pending Cloud State */
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                    <Info className="size-4 shrink-0 text-blue-500" />
                    <span>Cloud AI Evaluation: Pending Cloud</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The EdgeBox has recorded and uploaded this clip. The Cloud AI evaluation worker is queued or processing stream chunks.
                  </p>
                </div>
              ) : isFailed ? (
                /* Failed Analysis State */
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                    <AlertTriangle className="size-4 shrink-0 text-rose-500" />
                    <span>Cloud AI Evaluation: Worker Timeout / Analysis Failed</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cloud AI inference encountered an error or timeout. The recorded media is securely preserved and available for manual security review.
                  </p>
                </div>
              ) : (
                /* Informative Pending / In-Queue Flow State */
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                    <Info className="size-4 shrink-0" />
                    <span>Cloud AI Evaluation: In Processing Flow / Awaiting Worker</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This incident clip was successfully captured and recorded on-site by the EdgeBox hardware. The Cloud AI evaluation worker is queued or awaiting flow dispatch for this session.
                  </p>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    All on-premise video recordings and keyframes remain safely stored and intact. Security operators can inspect the footage above and manually confirm threat or dismiss false alarm using the controls on the right.
                  </p>
                </div>
              )}

              {/* False Alarm Notice if present */}
              {event.falseAlarmReason && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-3 mt-2">
                  <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-sm">False Alarm Reason Recorded</p>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{event.falseAlarmReason}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Hardware EdgeBox, Customer, Triage & Notifications) */}
        <div className="space-y-6">
          {/* Security Operator Triage Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="size-4 text-primary" />
                Security Operator Triage
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Review this incident and confirm whether it represents an active security threat or a discarded false alarm.
              </p>

              {!showDismissInput ? (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10 text-xs gap-1.5"
                    disabled={reviewing !== null || event.status === "DISMISSED_BY_USER"}
                    onClick={() => setShowDismissInput(true)}
                  >
                    <XCircle className="size-3.5" />
                    False Alarm
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                    disabled={reviewing !== null || event.status === "CONFIRMED_ALERT"}
                    onClick={() => handleReview("CONFIRMED_ALERT")}
                  >
                    {reviewing === "CONFIRMED_ALERT" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    Confirm Threat
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 space-y-2 mt-2">
                  <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs block">
                    Dismiss as False Alarm
                  </span>
                  <input
                    type="text"
                    placeholder="Reason (e.g. store employee, animal, lighting change)..."
                    className="w-full text-xs bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-rose-500"
                    value={dismissReason}
                    onChange={(e) => setDismissReason(e.target.value)}
                  />
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowDismissInput(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                      disabled={reviewing !== null}
                      onClick={() => handleReview("DISMISSED_BY_USER")}
                    >
                      {reviewing === "DISMISSED_BY_USER" && <Loader2 className="mr-1 size-3 animate-spin" />}
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tier 1: On-Premise EdgeBox Detection Hardware Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">
                  On-Premise EdgeBox (Tier 1)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg border border-border/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Edge Detection:</span>
                  <span className="font-semibold text-foreground">{event.edgeLabel}</span>
                </div>
                {event.edgeConfidence !== null && event.edgeConfidence !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Model Confidence:</span>
                      <span className="font-mono font-medium text-foreground">
                        {Math.round(event.edgeConfidence * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round(event.edgeConfidence * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Hardware Box ID:</span>
                <span className="font-mono font-medium text-foreground">{event.deviceId || "Unassigned"}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Device Model:</span>
                <span className="font-medium text-foreground">{event.device?.modelCode || "EdgeBox"}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Camera Stream:</span>
                <span className="font-semibold text-foreground">{cameraName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">RTSP Channel:</span>
                <span className="font-mono font-medium text-foreground">Channel {event.channelNumber || 1}</span>
              </div>

              {event.deviceId && (
                <Link
                  href={`/dashboard/devices?selected=${event.deviceId}`}
                  scroll={true}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full text-xs gap-1.5 border-border hover:bg-muted mt-2"
                  )}
                >
                  <ExternalLink className="size-3.5" />
                  Inspect Device Hardware
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Alert Dispatch & Email Variations Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">
                  Alert Dispatch & Notifications
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              {event.alertChannels && event.alertChannels.length > 0 ? (
                <>
                  <div className="space-y-1.5">
                    <span className="text-muted-foreground block text-[11px]">Dispatched Channels:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {event.alertChannels.map((ch, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs uppercase font-mono px-2.5 py-0.5 flex items-center gap-1"
                        >
                          {ch === "EMAIL" && <Mail className="size-3" />}
                          {ch}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Email variation details */}
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5 text-primary" />
                        {emailVariation.name}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${emailVariation.badgeColor}`}>
                        {emailVariation.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {emailVariation.desc}
                    </p>
                  </div>

                  {event.alertDispatchedAt && (
                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-muted-foreground">Dispatched At:</span>
                      <span className="font-mono text-foreground">
                        {new Date(event.alertDispatchedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-muted/20 rounded-lg border border-border/40 text-center space-y-1">
                  <span className="text-muted-foreground font-medium block">No Alert Dispatched</span>
                  <p className="text-[11px] text-muted-foreground">
                    Threat level remained below automatic customer escalation threshold.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Store Site Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                Customer Site
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Site Name:</span>
                <span className="font-semibold text-foreground">{customerName}</span>
              </div>

              {event.businessAccountId && (
                <Link
                  href={`/dashboard/customers/${event.businessAccountId}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 mt-2"
                  )}
                >
                  <ExternalLink className="size-3.5" />
                  Open Customer & Fleet Profile
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Telemetry Timestamps Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                Telemetry Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Registered:</span>
                <span className="font-mono text-foreground">{new Date(event.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-mono text-muted-foreground">{new Date(event.updatedAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-Screen Keyframe Image Inspection Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-zinc-900/90 px-4 py-2.5 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                Keyframe Snapshot Evidence
              </span>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-md"
              >
                <X className="size-4" />
              </button>
            </div>
            <img
              src={enlargedImage}
              alt="Enlarged Keyframe"
              className="max-h-[80vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
