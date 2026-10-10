"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getEventDetailsAction,
  reviewEventAction,
} from "@/lib/actions/event.actions";
import { toast } from "sonner";
import {
  Loader2,
  ShieldAlert,
  Video,
  Camera,
  HardDrive,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  Tag,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Bell,
  Sparkles,
  Cloud,
} from "lucide-react";
import type { CameraEventItem, CameraEventDetail, EventThreatLevel } from "@/lib/types";

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CameraEventItem | null;
  onSuccess?: () => void;
}

const threatBadges: Record<
  EventThreatLevel,
  { label: string; bg: string; dot: string }
> = {
  CRITICAL: {
    label: "Critical Threat",
    bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    dot: "bg-red-500",
  },
  HIGH: {
    label: "High Alert",
    bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    dot: "bg-rose-500",
  },
  MEDIUM: {
    label: "Medium Priority",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low Priority",
    bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    dot: "bg-blue-500",
  },
  NONE: {
    label: "Routine / Info",
    bg: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
};

const statusColors: Record<string, string> = {
  CONFIRMED_ALERT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  DISMISSED_BY_USER: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  DISCARDED_FALSE_ALARM: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PROCESSING_AI: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  RECORDED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PENDING_UPLOAD: "bg-muted text-muted-foreground border-border",
};

export function EventDetailsDialog({
  open,
  onOpenChange,
  event: initialEvent,
  onSuccess,
}: EventDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<CameraEventDetail | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [showDismissInput, setShowDismissInput] = useState(false);

  useEffect(() => {
    if (open && initialEvent?.id) {
      setLoading(true);
      setShowRawJson(false);
      setShowDismissInput(false);
      setDismissReason("");
      getEventDetailsAction(initialEvent.id)
        .then((res) => {
          if (res.success && res.data) {
            setDetail(res.data);
          } else {
            setDetail(initialEvent as CameraEventDetail);
          }
        })
        .catch(() => {
          setDetail(initialEvent as CameraEventDetail);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDetail(null);
    }
  }, [open, initialEvent]);

  if (!initialEvent) return null;

  // Normalized properties across camelCase and snake_case
  const event = detail || initialEvent;
  const eventId = event.id;
  const edgeLabel = event.edgeLabel || (event as any).edge_label || "Detection Event";
  const edgeConfidence = event.edgeConfidence ?? (event as any).edge_confidence;
  const threatLevel = ((event.threatLevel || (event as any).threat_level || "NONE") as EventThreatLevel);
  const threatInfo = threatBadges[threatLevel] || threatBadges.NONE;
  const status = event.status || "RECORDED";
  const deviceId = event.deviceId || (event as any).device_id || "";
  const modelCode = event.device?.modelCode || (event as any).device_model || "EdgeBox";
  const businessAccountId = event.businessAccountId || (event as any).business_account_id;
  const accountName = event.account?.name || (event as any).account_name || "Direct Customer Site";
  const channelNumber = event.channelNumber ?? (event as any).channel_number ?? 1;
  const cameraName = event.camera?.name || `Camera #${channelNumber}`;
  const createdAtStr = event.createdAt || (event as any).created_at;
  const formattedDate = createdAtStr ? new Date(createdAtStr).toLocaleString() : "Recent Event";
  const falseAlarmReason = event.falseAlarmReason || (event as any).false_alarm_reason;
  const alertChannels = event.alertChannels || (event as any).alert_channels || [];
  const durationSeconds = event.totalDurationSeconds ?? (event as any).total_duration_seconds;

  // Media resolution
  const primaryVideo = (detail?.videos && detail.videos[0]) || (event.videos && event.videos[0]);
  const videoPlaybackUrl = primaryVideo?.playback_url || primaryVideo?.playbackUrl || primaryVideo?.clip_url || primaryVideo?.clipUrl;
  const videoDuration = primaryVideo?.duration_seconds || primaryVideo?.durationSeconds || durationSeconds || 10;

  const primaryThumbnail =
    (detail?.thumbnails && (detail.thumbnails.find((t) => t.is_primary || t.isPrimary) || detail.thumbnails[0])) ||
    (event.thumbnails && (event.thumbnails.find((t) => t.is_primary || t.isPrimary) || event.thumbnails[0])) ||
    (event as any).cover_thumbnail;

  const thumbnailViewUrl = primaryThumbnail?.view_url || primaryThumbnail?.viewUrl || primaryThumbnail?.thumbnail_url || primaryThumbnail?.thumbnailUrl;

  const aiSummary =
    primaryThumbnail?.ai_summary ||
    primaryThumbnail?.aiSummary ||
    primaryVideo?.ai_summary ||
    primaryVideo?.aiSummary;

  const rawDetected =
    primaryThumbnail?.detected_objects ||
    primaryThumbnail?.detectedObjects ||
    primaryVideo?.detected_objects ||
    primaryVideo?.detectedObjects ||
    [];

  const detectedObjects: string[] = Array.isArray(rawDetected) ? rawDetected : [];

  const handleCopyId = () => {
    navigator.clipboard.writeText(eventId);
    setCopiedId(true);
    toast.success("Event ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleReview = async (reviewStatus: "CONFIRMED_ALERT" | "DISMISSED_BY_USER") => {
    setReviewing(reviewStatus);
    try {
      const res = await reviewEventAction(eventId, {
        status: reviewStatus,
        falseAlarmReason:
          reviewStatus === "DISMISSED_BY_USER"
            ? (dismissReason.trim() || "Marked as false alarm from Admin Console")
            : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update review status");
        return;
      }

      toast.success(
        reviewStatus === "CONFIRMED_ALERT"
          ? "Event confirmed as active threat"
          : "Event dismissed as false alarm"
      );
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Modal Top Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/40">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${threatInfo.bg}`}>
                <span className={`size-1.5 rounded-full ${threatInfo.dot}`} />
                {threatInfo.label}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${statusColors[status] || "border-border"}`}
              >
                {status.replace(/_/g, " ")}
              </Badge>
            </div>

            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50 transition-colors"
              title="Copy full Event ID"
            >
              {copiedId ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{eventId.slice(0, 10)}...</span>
            </button>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground pt-3 flex items-center gap-2">
            <span>{edgeLabel}</span>
            {edgeConfidence !== null && edgeConfidence !== undefined && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {Math.round(edgeConfidence * 100)}% confidence
              </span>
            )}
          </DialogTitle>

          <DialogDescription className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Clock className="size-3.5 text-muted-foreground" />
            Detected on {formattedDate}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs px-3 py-1 flex items-center gap-1.5 font-medium">
              <Cloud className="size-3.5" />
              Pending Cloud • Loading Telemetry
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-5 text-xs">
            {/* Media Box (Video Player or Snapshot) */}
            <div className="rounded-xl border border-border/60 bg-black overflow-hidden flex flex-col items-center justify-center min-h-[240px] shadow-sm">
              {videoPlaybackUrl ? (
                <div className="w-full">
                  <video
                    src={videoPlaybackUrl}
                    controls
                    playsInline
                    className="w-full max-h-[340px] rounded-t-lg bg-black aspect-video object-contain"
                  />
                  <div className="flex items-center justify-between bg-zinc-950 px-3.5 py-2 text-[11px] text-zinc-400 border-t border-zinc-800">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                      <Video className="size-3.5" />
                      Recorded Forensic Clip ({videoDuration}s)
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">Tier-2 Cloud Storage</span>
                  </div>
                </div>
              ) : thumbnailViewUrl ? (
                <div className="w-full">
                  <img
                    src={thumbnailViewUrl}
                    alt={edgeLabel}
                    className="w-full max-h-[320px] object-contain bg-black"
                  />
                  <div className="flex items-center justify-between bg-zinc-950 px-3.5 py-2 text-[11px] text-zinc-400 border-t border-zinc-800">
                    <span className="flex items-center gap-1.5 font-medium text-amber-400">
                      <Camera className="size-3.5" />
                      Incident Keyframe Snapshot
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">Tier-1 Realtime Triage</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-center text-zinc-500">
                  <Radio className="size-10 mb-2 stroke-1 text-zinc-600" />
                  <p className="text-xs font-semibold text-zinc-400">Telemetry-Only Event</p>
                  <p className="text-[11px] text-zinc-600 max-w-xs mt-0.5">
                    Triggered via edge MQTT telemetry stream without recorded visual clip attached.
                  </p>
                </div>
              )}
            </div>

            {/* Core Device, Store & Camera Mapping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/20 p-3.5 text-xs">
              <div>
                <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Building2 className="size-3.5 text-primary" /> Customer Store
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-semibold text-foreground text-sm">
                    {accountName}
                  </span>
                  {businessAccountId && (
                    <Link
                      href={`/dashboard/customers/${businessAccountId}`}
                      className="text-primary hover:underline text-[11px] flex items-center"
                      title="Open Customer Fleet Profile"
                    >
                      <ExternalLink className="size-3 ml-0.5" />
                    </Link>
                  )}
                </div>
              </div>

              <div>
                <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Camera className="size-3.5 text-primary" /> Camera Stream
                </span>
                <p className="mt-1 font-semibold text-foreground text-sm">
                  {cameraName} (Ch #{channelNumber})
                </p>
              </div>

              <div>
                <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <HardDrive className="size-3.5 text-primary" /> EdgeBox Hardware
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono font-medium text-foreground">
                    {deviceId || "Unassigned Box"}
                  </span>
                  <span className="text-muted-foreground">({modelCode})</span>
                  {deviceId && (
                    <Link
                      href={`/dashboard/devices?selected=${deviceId}`}
                      scroll={true}
                      className="text-primary hover:underline text-[11px] flex items-center"
                      title="Inspect EdgeBox Details"
                    >
                      <ExternalLink className="size-3 ml-0.5" />
                    </Link>
                  )}
                </div>
              </div>

              <div>
                <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Tag className="size-3.5 text-primary" /> Threat Level
                </span>
                <p className="mt-1 font-semibold text-foreground">
                  {threatLevel} Priority
                </p>
              </div>
            </div>

            {/* AI Forensic Intelligence Card */}
            {(aiSummary || detectedObjects.length > 0) && (
              <div className="space-y-2.5 rounded-lg border border-border/60 bg-card p-3.5 shadow-xs">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Cloud AI Forensic Summary
                </span>
                {aiSummary && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {aiSummary}
                  </p>
                )}

                {detectedObjects.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground block">Recognized Entities:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedObjects.map((obj, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 font-medium text-[11px] text-primary"
                        >
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notification Dispatch Channels */}
            {alertChannels.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                <Bell className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[11px]">Alerts Dispatched:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {alertChannels.map((ch: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                      {ch}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* False Alarm Notice if dismissed */}
            {falseAlarmReason && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">False Alarm Reason Noted:</p>
                  <p className="mt-0.5 text-muted-foreground">{falseAlarmReason}</p>
                </div>
              </div>
            )}

            {/* Dismiss reason input if triggered */}
            {showDismissInput && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 space-y-2">
                <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs block">
                  Dismiss as False Alarm
                </span>
                <input
                  type="text"
                  placeholder="Optional note: why was this a false alarm? (e.g. reflection, staff member)"
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
                    Confirm Dismissal
                  </Button>
                </div>
              </div>
            )}

            {/* Raw JSON Inspector */}
            <div className="pt-1 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowRawJson(!showRawJson)}
              >
                <Code className="mr-1.5 size-3.5" />
                {showRawJson ? "Hide Technical Payload" : "View Technical Payload"}
              </Button>

              {showRawJson && (
                <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border/60 bg-zinc-950 p-3 text-[11px] font-mono text-emerald-400">
                  {JSON.stringify(event, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        <DialogFooter className="p-4 border-t border-border/40 flex-col sm:flex-row sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {!showDismissInput && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10 text-xs"
                disabled={reviewing !== null || status === "DISMISSED_BY_USER"}
                onClick={() => setShowDismissInput(true)}
              >
                <XCircle className="mr-1.5 size-3.5" />
                Mark False Alarm
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              disabled={reviewing !== null || status === "CONFIRMED_ALERT"}
              onClick={() => handleReview("CONFIRMED_ALERT")}
            >
              {reviewing === "CONFIRMED_ALERT" ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 size-3.5" />
              )}
              Confirm Threat
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/activity/${eventId}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              )}
            >
              <span>Full Investigation Page</span>
              <ExternalLink className="size-3" />
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
