"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * The single place relative times and "last seen" are decided, so the same moment reads the same on
 * every card. Both pieces of state live in small module stores shared by everything on the page.
 */

const toMs = (at: string | number | null | undefined) => {
  if (at === null || at === undefined) return null;
  const t = typeof at === "number" ? at : new Date(at).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Floored to whole minutes everywhere: "just now", "7m ago", "3h 52m ago", "2d 3h ago". */
export function formatAgo(at: string | number | null | undefined, now: number): string | null {
  const t = toMs(at);
  if (t === null) return null;
  const mins = Math.floor(Math.max(0, now - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h${mins % 60 ? ` ${mins % 60}m` : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d}d${h % 24 ? ` ${h % 24}h` : ""} ago`;
}

// --- shared "now" (refreshed on mount and after each live check; never on its own) ---
let nowValue = typeof window === "undefined" ? 0 : Date.now();
const nowListeners = new Set<() => void>();
export function refreshNow() {
  nowValue = Date.now();
  nowListeners.forEach((l) => l());
}
const subscribeNow = (l: () => void) => {
  nowListeners.add(l);
  return () => nowListeners.delete(l);
};
const serverNow = () => (typeof window === "undefined" ? Date.now() : nowValue);
export function useNow() {
  return React.useSyncExternalStore(subscribeNow, () => nowValue, serverNow);
}

// --- shared "last seen" per device: the record's value until a live check reports a newer one ---
const lastSeenByDevice = new Map<string, string>();
const seenListeners = new Set<() => void>();
export function setSharedLastSeen(deviceId: string, iso: string | null) {
  if (!iso) return;
  lastSeenByDevice.set(deviceId, iso);
  seenListeners.forEach((l) => l());
}
const subscribeSeen = (l: () => void) => {
  seenListeners.add(l);
  return () => seenListeners.delete(l);
};
export function useSharedLastSeen(deviceId: string, fallback: string | null): string | null {
  const shared = React.useSyncExternalStore(
    subscribeSeen,
    () => lastSeenByDevice.get(deviceId) ?? null,
    () => null
  );
  return shared ?? fallback;
}

/** Clock time of a data point: "16:17" for today, "31 Oct 16:17" for earlier days. Exact timestamp on hover. */
export function At({ at, className }: { at: string | number | null | undefined; className?: string }) {
  const now = useNow();
  const t = toMs(at);
  if (t === null) return null;
  const d = new Date(t);
  const clock = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const text =
    d.toDateString() === new Date(now).toDateString()
      ? clock
      : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${clock}`;
  return (
    <span title={d.toLocaleString()} className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}

/** Relative time with the exact timestamp on hover. */
export function Ago({ at, className }: { at: string | number | null | undefined; className?: string }) {
  const now = useNow();
  const t = toMs(at);
  if (t === null) return null;
  return (
    <span title={new Date(t).toLocaleString()} className={className} suppressHydrationWarning>
      {formatAgo(t, now)}
    </span>
  );
}

/** "Last seen" for a device, from the same source as the top card (used by Cloud Status). */
export function LastSeen({ deviceId, iso, fallback = "Never" }: { deviceId: string; iso: string | null; fallback?: string }) {
  React.useEffect(() => refreshNow(), []);
  const shared = useSharedLastSeen(deviceId, iso);
  return shared ? <Ago at={shared} /> : <>{fallback}</>;
}

/**
 * "Live - just now" or "Stored - from 16:17": the same tag on Vitals and every chart header.
 * For stored values `at` is the data point's own time, not when the device was last seen.
 */
export function SourceTag({
  live,
  at,
  badge = false,
}: {
  live: boolean;
  at: string | number | null | undefined;
  /** Vitals header shows the word as a badge; chart headers keep it plain. */
  badge?: boolean;
}) {
  const word = live ? "Live" : "Stored";
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {badge ? (
        <Badge variant={live ? "success" : "outline"} className={`px-2 py-0 text-[11px] ${live ? "" : "text-muted-foreground"}`}>
          {word}
        </Badge>
      ) : (
        <span className="font-medium">{word}</span>
      )}
      <span>
        - {live ? <Ago at={at} /> : <>from <At at={at} /></>}
      </span>
    </span>
  );
}
