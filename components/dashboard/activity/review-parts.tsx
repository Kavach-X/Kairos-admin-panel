"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- events arrive in mixed camelCase/snake_case shapes from the list and detail APIs */

import * as React from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  Sparkles,
  Video,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { reviewEventAction } from "@/lib/actions/event.actions";

/**
 * The list view and the detail page hand us events in both camelCase and snake_case, so every
 * field is read through `pick`. `any` is deliberate here: it is the same tolerance the callers already use.
 */
type RawEvent = any;

const pick = (o: any, camel: string, snake: string) => o?.[camel] ?? o?.[snake];

const PENDING_STATUSES = ["PENDING_UPLOAD", "RECORDED", "PROCESSING_AI"];

export function describeEventDecision(event: RawEvent): { title: string; detail: string; tone: "pending" | "threat" | "clear" | "manual" } {
  const status: string = event?.status || "RECORDED";
  const reviewedAt = pick(event, "reviewedAt", "reviewed_at");
  const before = pick(event, "statusBeforeReview", "status_before_review");

  const beforeText: Record<string, string> = {
    CONFIRMED_ALERT: "AI had flagged a threat",
    DISCARDED_FALSE_ALARM: "AI had marked it a false alarm",
    PENDING_UPLOAD: "media was not uploaded yet",
    RECORDED: "AI had not decided yet",
    PROCESSING_AI: "AI had not decided yet",
  };

  if (reviewedAt) {
    const when = new Date(reviewedAt).toLocaleString();
    const was = before && beforeText[before] ? ` (${beforeText[before]})` : "";
    return status === "CONFIRMED_ALERT"
      ? { title: "Confirmed as a threat by an operator", detail: `Reviewed manually on ${when}${was}.`, tone: "manual" }
      : { title: "Marked as a false alarm by an operator", detail: `Reviewed manually on ${when}${was}.`, tone: "manual" };
  }

  switch (status) {
    case "PENDING_UPLOAD":
      return { title: "Waiting for media", detail: "The EdgeBox has not finished uploading the snapshot or clip yet.", tone: "pending" };
    case "RECORDED":
    case "PROCESSING_AI":
      return { title: "AI has not made a final decision", detail: "Analysis is still running, queued, or failed. You can decide manually.", tone: "pending" };
    case "CONFIRMED_ALERT":
      return { title: "AI confirmed a threat", detail: "The customer was alerted. You can overrule this if it was wrong.", tone: "threat" };
    case "DISCARDED_FALSE_ALARM":
      return { title: "AI judged this a false alarm", detail: "No alert was sent. You can overrule this if a real threat was missed.", tone: "clear" };
    case "DISMISSED_BY_USER":
      return { title: "Dismissed as a false alarm", detail: "A person dismissed this event.", tone: "manual" };
    default:
      return { title: status.replace(/_/g, " "), detail: "", tone: "pending" };
  }
}

interface AnalysisItem {
  key: string;
  kind: "snapshot" | "clip";
  label: string;
  aiStatus: string;
  isVerified: boolean | null;
  threatLevel: string;
  summary: string | null;
  objects: string[];
}

function toItems(event: RawEvent): AnalysisItem[] {
  const items: AnalysisItem[] = [];

  const thumbnails: any[] = event?.thumbnails?.length ? event.thumbnails : event?.cover_thumbnail ? [event.cover_thumbnail] : [];
  [...thumbnails]
    .sort((a, b) => Number(!!pick(b, "isPrimary", "is_primary")) - Number(!!pick(a, "isPrimary", "is_primary")))
    .forEach((t, i) => {
      items.push({
        key: t.id || `t${i}`,
        kind: "snapshot",
        label: thumbnails.length > 1 ? `Snapshot ${i + 1}` : "Snapshot",
        aiStatus: pick(t, "aiStatus", "ai_status") || "PENDING",
        isVerified: pick(t, "isVerified", "is_verified") ?? null,
        threatLevel: pick(t, "threatLevel", "threat_level") || "NONE",
        summary: pick(t, "aiSummary", "ai_summary") ?? null,
        objects: pick(t, "detectedObjects", "detected_objects") || [],
      });
    });

  const videos: any[] = event?.videos || [];
  [...videos]
    .sort((a, b) => (pick(a, "sequenceNumber", "sequence_number") ?? 0) - (pick(b, "sequenceNumber", "sequence_number") ?? 0))
    .forEach((v, i) => {
      items.push({
        key: v.id || `v${i}`,
        kind: "clip",
        label: videos.length > 1 ? `Clip ${pick(v, "sequenceNumber", "sequence_number") ?? i + 1}` : "Clip",
        aiStatus: pick(v, "aiStatus", "ai_status") || "PENDING",
        isVerified: pick(v, "isVerified", "is_verified") ?? null,
        threatLevel: pick(v, "threatLevel", "threat_level") || "NONE",
        summary: pick(v, "aiSummary", "ai_summary") ?? null,
        objects: pick(v, "detectedObjects", "detected_objects") || [],
      });
    });

  return items;
}

function StatusChip({ item }: { item: AnalysisItem }) {
  const base = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold";
  if (item.aiStatus === "FAILED") {
    return (
      <span className={cn(base, "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
        <AlertTriangle className="size-3" /> Analysis failed
      </span>
    );
  }
  if (item.aiStatus === "COMPLETED") {
    return item.isVerified ? (
      <span className={cn(base, "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400")}>
        <ShieldAlert className="size-3" /> Threat detected · {item.threatLevel}
      </span>
    ) : (
      <span className={cn(base, "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}>
        <CheckCircle2 className="size-3" /> No threat
      </span>
    );
  }
  return (
    <span className={cn(base, "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400")}>
      <Clock className="size-3" /> {item.aiStatus === "ANALYZING" ? "Analyzing" : "Pending"}
    </span>
  );
}

/** One block per analysed snapshot and per clip chunk, so neither hides the other. */
export function AiAnalysisSections({ event }: { event: RawEvent }) {
  const items = toItems(event);

  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed">
        No snapshot or clip has been uploaded for this event yet, so there is nothing for the AI to analyse.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              {item.kind === "snapshot" ? <Camera className="size-3.5 text-primary" /> : <Video className="size-3.5 text-primary" />}
              {item.label} analysis
            </span>
            <StatusChip item={item} />
          </div>

          {item.aiStatus === "COMPLETED" && item.summary && (
            <p className="text-xs text-foreground leading-relaxed">{item.summary}</p>
          )}
          {item.aiStatus === "FAILED" && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              The AI could not analyse this {item.kind === "snapshot" ? "snapshot" : "clip"}. The media is kept for manual review.
              {item.summary ? ` (${item.summary})` : ""}
            </p>
          )}
          {(item.aiStatus === "PENDING" || item.aiStatus === "ANALYZING") && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Waiting for the AI result. If this stays pending for more than a few minutes it is retried automatically.
            </p>
          )}

          {item.aiStatus === "COMPLETED" && item.objects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.objects.map((obj, i) => (
                <span key={i} className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 font-medium text-[11px] text-primary">
                  {obj}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type Choice = "confirm" | "dismiss";

interface ManualReviewDialogProps {
  event: RawEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/** The only place an operator settles or overrules the AI. Opens from a single "Review manually" button. */
export function ManualReviewDialog({ event, open, onOpenChange, onDone }: ManualReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ReviewForm event={event} onOpenChange={onOpenChange} onDone={onDone} />}
    </Dialog>
  );
}

function ReviewForm({ event, onOpenChange, onDone }: Omit<ManualReviewDialogProps, "open">) {
  const status: string = event?.status || "RECORDED";
  const alertDispatchedAt = pick(event, "alertDispatchedAt", "alert_dispatched_at");
  const decision = describeEventDecision(event);
  const isPending = PENDING_STATUSES.includes(status);

  // Options that make sense for the current state (no point "dismissing" what the AI already dismissed).
  const canConfirm = status !== "CONFIRMED_ALERT";
  const canDismiss = status !== "DISMISSED_BY_USER" && status !== "DISCARDED_FALSE_ALARM";

  const [choice, setChoice] = React.useState<Choice | null>(
    canConfirm && !canDismiss ? "confirm" : canDismiss && !canConfirm ? "dismiss" : null
  );
  const [severity, setSeverity] = React.useState<"MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async () => {
    if (!choice || !event?.id) return;
    setSubmitting(true);
    try {
      const res = await reviewEventAction(event.id, {
        status: choice === "confirm" ? "CONFIRMED_ALERT" : "DISMISSED_BY_USER",
        ...(choice === "confirm"
          ? { threatLevel: severity }
          : { falseAlarmReason: reason.trim() || "Marked as a false alarm by an operator" }),
      });
      if (!res.success) {
        toast.error(res.error || "Failed to save your decision");
        return;
      }
      toast.success(choice === "confirm" ? "Confirmed as a threat" : "Marked as a false alarm");
      onOpenChange(false);
      onDone();
    } catch {
      toast.error("Failed to save your decision");
    } finally {
      setSubmitting(false);
    }
  };

  const optionClass = (selected: boolean, tone: "confirm" | "dismiss") =>
    cn(
      "w-full text-left rounded-lg border p-3 transition-colors",
      selected
        ? tone === "confirm"
          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
          : "border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/30"
        : "border-border hover:border-primary/40"
    );

  return (
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-primary" />
            Review manually
          </DialogTitle>
          <DialogDescription className="text-xs">
            Use this when the AI is wrong or has not decided. Your decision is recorded with your name and time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Sparkles className="size-3.5 text-primary" />
              {decision.title}
            </span>
            {decision.detail && <p className="text-muted-foreground leading-relaxed">{decision.detail}</p>}
          </div>

          <AiAnalysisSections event={event} />

          {isPending && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                The AI has not finished. Your decision will stand: a later AI result will not undo a confirmed threat or a false alarm you set.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <span className="font-semibold text-foreground block">Your decision</span>

            {canConfirm && (
              <button type="button" className={optionClass(choice === "confirm", "confirm")} onClick={() => setChoice("confirm")}>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  {status === "DISCARDED_FALSE_ALARM" ? "Confirm threat (overrule AI)" : "Confirm threat"}
                </span>
                <span className="block mt-1 text-muted-foreground">
                  {alertDispatchedAt
                    ? "The customer was already alerted for this event, so no new alert is sent."
                    : "The customer is alerted right away."}
                </span>
                {choice === "confirm" && (
                  <span className="mt-2 flex items-center gap-2">
                    <label htmlFor="review-severity" className="text-muted-foreground">Severity</label>
                    <select
                      id="review-severity"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as typeof severity)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    >
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </span>
                )}
              </button>
            )}

            {canDismiss && (
              <button type="button" className={optionClass(choice === "dismiss", "dismiss")} onClick={() => setChoice("dismiss")}>
                <span className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
                  <XCircle className="size-3.5" />
                  {status === "CONFIRMED_ALERT" ? "Mark as false alarm (overrule AI)" : "Mark as false alarm"}
                </span>
                <span className="block mt-1 text-muted-foreground">No further alerts are sent for this event.</span>
                {choice === "dismiss" && (
                  <input
                    type="text"
                    autoFocus
                    value={reason}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (e.g. staff member, animal, lighting change)"
                    className="mt-2 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-rose-500"
                  />
                )}
              </button>
            )}

            {!canConfirm && !canDismiss && (
              <p className="text-muted-foreground">There is nothing left to decide for this event.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" size="sm" className="text-xs" disabled={submitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={cn("text-xs text-white", choice === "dismiss" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700")}
            disabled={!choice || submitting}
            onClick={submit}
          >
            {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {choice === "dismiss" ? "Save false alarm" : "Confirm threat"}
          </Button>
        </DialogFooter>
      </DialogContent>
  );
}
