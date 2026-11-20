import { Badge } from "@/components/ui/badge";
import type { EventIncidentStatus, EventThreatLevel } from "@/lib/types";

const THREAT: Record<
  EventThreatLevel,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "warning" | "info" }
> = {
  CRITICAL: { label: "Critical", variant: "destructive" },
  HIGH: { label: "High", variant: "destructive" },
  MEDIUM: { label: "Medium", variant: "warning" },
  LOW: { label: "Low", variant: "info" },
  NONE: { label: "Info", variant: "outline" },
};

const STATUS: Record<EventIncidentStatus, { label: string; className: string }> = {
  CONFIRMED_ALERT: { label: "Confirmed", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30" },
  DISCARDED_FALSE_ALARM: { label: "AI false alarm", className: "text-muted-foreground" },
  DISMISSED_BY_USER: { label: "Dismissed", className: "text-muted-foreground" },
  PROCESSING_AI: { label: "AI analysing", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  RECORDED: { label: "Awaiting AI", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  PENDING_UPLOAD: { label: "Uploading", className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30" },
};

export function ThreatBadge({ level }: { level?: EventThreatLevel | null }) {
  const t = THREAT[level ?? "NONE"] ?? THREAT.NONE;
  return (
    <Badge variant={t.variant} className="px-1.5 py-0 text-[10px]">
      {t.label}
    </Badge>
  );
}

export function EventStatusBadge({ status }: { status?: EventIncidentStatus | null }) {
  const s = STATUS[status ?? "RECORDED"] ?? { label: String(status).replace(/_/g, " "), className: "" };
  return (
    <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${s.className}`}>
      {s.label}
    </Badge>
  );
}

/** "Just now" / "5m ago" / "3h ago" today; "Yesterday 14:05" / "18 Nov 14:05" beyond. */
export function formatEventTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (d.toDateString() === now.toDateString()) return `${Math.floor(sec / 3600)}h ago · ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ${time}`;
}

/** Day heading for grouping the list: "Today", "Yesterday", "Mon, 18 Nov". */
export function dayHeading(iso: string, now = new Date()) {
  const d = new Date(iso);
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}
