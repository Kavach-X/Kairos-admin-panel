import type * as React from "react";
import type { TelemetryRange } from "@/lib/types";

export const HOUR_MS = 3_600_000;

export const RANGE_HOURS: Record<TelemetryRange, number> = { "24h": 24, "7d": 168, "30d": 720 };

/** Offline gaps shorter than this are not reported, and lines are not broken for them. */
export const OFFLINE_GAP_MS = 3 * HOUR_MS;

/** Diagonal hatch used for "no data" cells. */
export const HATCH_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, var(--color-border) 0 2px, transparent 2px 5px)",
};

// ─── Offline gaps ───────────────────────────────────────────────────

export interface Gap {
  start: number;
  end: number;
}

/**
 * Periods longer than OFFLINE_GAP_MS with no data. An hourly row for hour H covers H..H+1h, a live
 * reading covers just its own instant. The tail gap runs from the last coverage to `windowEnd`.
 */
export function findOfflineGaps(hourStarts: number[], pointTimes: number[], windowEnd: number): Gap[] {
  const spans = [
    ...hourStarts.map((h) => ({ start: h, end: h + HOUR_MS })),
    ...pointTimes.map((t) => ({ start: t, end: t })),
  ].sort((a, b) => a.start - b.start);
  if (spans.length === 0) return [];

  const gaps: Gap[] = [];
  let coveredUntil = spans[0].end;
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start - coveredUntil > OFFLINE_GAP_MS) gaps.push({ start: coveredUntil, end: spans[i].start });
    coveredUntil = Math.max(coveredUntil, spans[i].end);
  }
  if (windowEnd - coveredUntil > OFFLINE_GAP_MS) gaps.push({ start: coveredUntil, end: windowEnd });
  return gaps;
}

// ─── Compressed time axis ───────────────────────────────────────────

export interface TimeAxis {
  /** Real time of the first point on the shared axis. */
  startT: number;
  /** Tick label for a real timestamp (time only when the span is within one day). */
  label: (t: number) => string;
  toX: (t: number) => number;
  xMax: number;
  ticks: { x: number; label: string }[];
  /** Narrow fixed-width markers standing in for the collapsed offline gaps. */
  gapAreas: { x1: number; x2: number; label: string }[];
  /** True when an offline gap lies between the two (sorted) timestamps. */
  isBreak: (a: number, b: number) => boolean;
}

/**
 * X axis built from the data points only: real time between points, but every offline gap is
 * collapsed into one marker of fixed width (5% of the data span).
 */
export function buildTimeAxis(times: number[], gaps: Gap[]): TimeAxis {
  const ts = [...new Set(times)].sort((a, b) => a - b);
  if (ts.length === 0) {
    return { startT: 0, label: () => "", toX: () => 0, xMax: 1, ticks: [], gapAreas: [], isBreak: () => false };
  }

  const first = ts[0];
  const last = ts[ts.length - 1];
  const inner = gaps.filter((g) => g.start >= first && g.end <= last);
  const dataSpan = last - first - inner.reduce((sum, g) => sum + (g.end - g.start), 0);
  const gapW = Math.max(dataSpan * 0.05, HOUR_MS / 2);

  const xs = new Map<number, number>([[first, 0]]);
  const gapAreas: TimeAxis["gapAreas"] = [];
  for (let i = 1; i < ts.length; i++) {
    const a = ts[i - 1];
    const b = ts[i];
    const g = inner.find((x) => x.start >= a && x.end <= b);
    const xa = xs.get(a)!;
    if (g) {
      const x1 = xa + (g.start - a);
      gapAreas.push({ x1, x2: x1 + gapW, label: `Offline ${formatDuration(g.end - g.start)}` });
      xs.set(b, x1 + gapW + (b - g.end));
    } else {
      xs.set(b, xa + (b - a));
    }
  }
  let xMax = xs.get(last)!;
  const tail = gaps.find((g) => g.start >= last && g.end > last);
  if (tail) {
    const x1 = xMax + (tail.start - last);
    gapAreas.push({ x1, x2: x1 + gapW, label: `Offline ${formatDuration(tail.end - tail.start)}` });
    xMax = x1 + gapW;
  }

  // ~4 labelled ticks, snapped to real data points so the label is a real time.
  const sameDay = new Date(first).toDateString() === new Date(last).toDateString();
  const label = (t: number) =>
    sameDay ? formatClock(t) : last - first <= 7 * 24 * HOUR_MS ? formatDayClock(t) : formatDayMonth(t);
  const ticks: TimeAxis["ticks"] = [];
  for (let k = 0; k <= 2; k++) {
    const target = (k / 2) * xs.get(last)!;
    let best = first;
    for (const t of ts) if (Math.abs(xs.get(t)! - target) < Math.abs(xs.get(best)! - target)) best = t;
    const x = xs.get(best)!;
    if (!ticks.some((tk) => tk.x === x)) ticks.push({ x, label: label(best) });
  }

  return {
    startT: first,
    label,
    toX: (t) => xs.get(t) ?? 0,
    xMax: Math.max(xMax, 1),
    ticks,
    gapAreas,
    isBreak: (a, b) => gaps.some((g) => g.start >= a && g.end <= b),
  };
}

// ─── Hour strip ─────────────────────────────────────────────────────

export interface StripValues {
  temp: number | null;
  cpu: number | null;
  memory: number | null;
  disk: number | null;
  wifi: number | null;
}

export type StripCell =
  | { kind: "hour"; t: number; has: boolean; status: string | null; cameras: number | null; values: StripValues | null }
  | { kind: "gap"; label: string };

export interface StripRow {
  timestamp: string;
  pipeline_status: string | null;
  cameras_configured: number | null;
  avg_temp: number | null;
  avg_cpu: number | null;
  avg_memory: number | null;
  disk_percent: number | null;
  wifi_rssi_dbm: number | null;
}

/**
 * One cell per hour from the first selected data hour to the last, coloured later by
 * pipeline_status. Hours with no row are "no data"; an offline gap > 3h collapses into one marker.
 */
export function buildStripCells(rows: StripRow[], gaps: Gap[]): StripCell[] {
  if (rows.length === 0) return [];
  const byHour = new Map<number, StripRow>();
  for (const r of rows) byHour.set(Math.floor(new Date(r.timestamp).getTime() / HOUR_MS) * HOUR_MS, r);
  const hours = [...byHour.keys()].sort((a, b) => a - b);
  const firstH = hours[0];
  const lastH = hours[hours.length - 1];

  const cells: StripCell[] = [];
  const emitted = new Set<Gap>();
  for (let h = firstH; h <= lastH; h += HOUR_MS) {
    const row = byHour.get(h);
    if (row) {
      cells.push({
        kind: "hour",
        t: h,
        has: true,
        status: row.pipeline_status,
        cameras: row.cameras_configured,
        values: {
          temp: row.avg_temp,
          cpu: row.avg_cpu,
          memory: row.avg_memory,
          disk: row.disk_percent,
          wifi: row.wifi_rssi_dbm,
        },
      });
      continue;
    }
    const g = gaps.find((x) => h >= x.start && h < x.end);
    if (g) {
      if (!emitted.has(g)) {
        emitted.add(g);
        cells.push({ kind: "gap", label: `Offline ${formatDuration(g.end - g.start)}` });
      }
    } else {
      cells.push({ kind: "hour", t: h, has: false, status: null, cameras: null, values: null });
    }
  }
  const tail = gaps.find((g) => g.start > lastH && !emitted.has(g));
  if (tail) cells.push({ kind: "gap", label: `Offline ${formatDuration(tail.end - tail.start)}` });
  return cells;
}

export function formatDuration(ms: number) {
  const h = Math.round(ms / HOUR_MS);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`;
}

/** "30 Oct 16:30" */
export function formatGapTime(t: number) {
  return new Date(t)
    .toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .replace(",", "");
}

/** "05:30" */
export function formatClock(t: number) {
  return new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "Thu 05:30" (no month or year) */
export function formatDayClock(t: number) {
  return `${new Date(t).toLocaleDateString("en-GB", { weekday: "short" })} ${formatClock(t)}`;
}

/** "30 Oct", for spans longer than a week where a weekday would be ambiguous. */
export function formatDayMonth(t: number) {
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatHour(t: number) {
  return new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Thresholds / status colours ────────────────────────────────────

export type Status = "ok" | "warn" | "crit";

export interface Thresholds {
  warn: number;
  crit: number;
  /** Lower values are worse (Wi-Fi dBm). */
  lowerIsWorse?: boolean;
}

export const THRESHOLDS = {
  temp: { warn: 70, crit: 80 },
  percent: { warn: 75, crit: 90 },
  wifi: { warn: -60, crit: -75, lowerIsWorse: true },
} satisfies Record<string, Thresholds>;

export function statusOf(value: number, t: Thresholds): Status {
  if (t.lowerIsWorse) return value < t.crit ? "crit" : value <= t.warn ? "warn" : "ok";
  return value >= t.crit ? "crit" : value >= t.warn ? "warn" : "ok";
}

export const STATUS_TEXT: Record<Status, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  crit: "text-rose-600 dark:text-rose-400",
};

/** Solid dot colour per status (status only; metric hues live in metric-config). */
export const STATUS_DOT: Record<Status, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  crit: "bg-rose-500",
};

export const STATUS_LABEL: Record<Status, string> = { ok: "Normal", warn: "Warning", crit: "Critical" };

export const THRESHOLD_STROKE = { warn: "hsl(38, 92%, 50%)", crit: "hsl(350, 89%, 60%)" };

export const STATUS_STROKE: Record<Status, string> = {
  ok: "hsl(160, 84%, 39%)",
  warn: THRESHOLD_STROKE.warn,
  crit: THRESHOLD_STROKE.crit,
};

/**
 * The value bands of a metric between `lo` and `hi`, listed top (hi) to bottom (lo) and clipped to
 * that range, each with its status. Used for status-coloured line gradients and area shading.
 */
export function statusBands(lo: number, hi: number, t: Thresholds): { from: number; to: number; status: Status }[] {
  const raw: { from: number; to: number; status: Status }[] = t.lowerIsWorse
    ? [
        { from: Infinity, to: t.warn, status: "ok" },
        { from: t.warn, to: t.crit, status: "warn" },
        { from: t.crit, to: -Infinity, status: "crit" },
      ]
    : [
        { from: Infinity, to: t.crit, status: "crit" },
        { from: t.crit, to: t.warn, status: "warn" },
        { from: t.warn, to: -Infinity, status: "ok" },
      ];
  return raw
    .map((b) => ({ from: Math.min(b.from, hi), to: Math.max(b.to, lo), status: b.status }))
    .filter((b) => b.from > b.to);
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface Stats {
  min: number;
  avg: number;
  max: number;
}

export function summarize(values: number[]): Stats | null {
  if (values.length === 0) return null;
  let min = values[0];
  let max = values[0];
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, avg: sum / values.length, max };
}

// ─── Recent events ──────────────────────────────────────────────────

export interface TelemetryEvent {
  t: number;
  kind: "offline" | "online" | "pipeline" | "firmware" | "restart";
  text: string;
}

const PIPELINE_LABEL: Record<string, string> = {
  running: "Running",
  idle_no_camera: "Idle - no camera",
  stopped: "Stopped",
};

/**
 * Notable changes in the selected hourly rows: offline/online gaps, pipeline status changes and
 * firmware changes. Newest first, at most `limit`.
 */
export function deriveEvents(
  rows: { timestamp: string; pipeline_status: string | null; firmware_version: string | null }[],
  gaps: Gap[],
  windowEnd: number,
  extra: TelemetryEvent[] = [],
  limit = 8
): TelemetryEvent[] {
  const events: TelemetryEvent[] = [...extra];

  for (const g of gaps) {
    const ongoing = g.end >= windowEnd;
    events.push({
      t: g.start,
      kind: "offline",
      text: ongoing ? `Offline for ${formatDuration(g.end - g.start)} and counting` : `Went offline for ${formatDuration(g.end - g.start)}`,
    });
    if (!ongoing) events.push({ t: g.end, kind: "online", text: "Back online" });
  }

  let prevStatus: string | null = null;
  let prevFirmware: string | null = null;
  for (const r of rows) {
    const t = new Date(r.timestamp).getTime();
    if (r.pipeline_status) {
      if (prevStatus && prevStatus !== r.pipeline_status) {
        events.push({
          t,
          kind: "pipeline",
          text: `Pipeline ${PIPELINE_LABEL[prevStatus] ?? prevStatus} → ${PIPELINE_LABEL[r.pipeline_status] ?? r.pipeline_status}`,
        });
      }
      prevStatus = r.pipeline_status;
    }
    if (r.firmware_version) {
      if (prevFirmware && prevFirmware !== r.firmware_version) {
        events.push({ t, kind: "firmware", text: `Firmware ${prevFirmware} → ${r.firmware_version}` });
      }
      prevFirmware = r.firmware_version;
    }
  }

  return events.sort((a, b) => b.t - a.t).slice(0, limit);
}

// ─── Restarts (from uptime) ─────────────────────────────────────────

export interface UptimePoint {
  t: number;
  /** Uptime in seconds. */
  up: number;
  src: "hourly" | "live";
}

export interface Restart {
  /** Index in the point list of the first reading after the restart. */
  index: number;
  /** Estimated boot time: reading time minus its uptime (never before the previous reading). */
  at: number;
}

// A drop in uptime this small, next to an hourly point, is a timing artefact (see cleanUptimePoints).
const ARTEFACT_MS = HOUR_MS;
const DROP_SLACK_MS = 5 * 60_000;
const ELAPSED_SLACK_MS = 30 * 60_000;

/**
 * Hourly points are stamped at the start of their hour but hold a sample taken later in it, while live
 * checks carry their exact time. Sorted by stamp, an hourly point can therefore sit just before a live
 * reading that has slightly LOWER uptime although nothing restarted. When a later point is lower than
 * an earlier one by less than an hour and one of the two is hourly, that is such an artefact: the
 * hourly point has no real reading time, so it is dropped (a live point keeps its exact time).
 * Live-to-live drops are never artefacts. Input must be sorted by time.
 */
export function cleanUptimePoints(points: UptimePoint[]): UptimePoint[] {
  const kept: UptimePoint[] = [];
  for (const p of points) {
    let skip = false;
    while (kept.length > 0) {
      const last = kept[kept.length - 1];
      const dropMs = (last.up - p.up) * 1000;
      if (dropMs > 0 && dropMs < ARTEFACT_MS && (last.src === "hourly" || p.src === "hourly")) {
        if (last.src === "hourly" && p.src === "live") kept.pop();
        else {
          skip = true;
          break;
        }
      } else break;
    }
    if (!skip) kept.push(p);
  }
  return kept;
}

/**
 * Restarts between consecutive (time-sorted, cleaned) readings. Uptime only grows while the device is
 * on, so it is a restart when uptime dropped, or when uptime is lower than the time elapsed since the
 * previous reading (the device restarted between two samples).
 */
export function detectRestarts(points: UptimePoint[]): Restart[] {
  const out: Restart[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const dropped = (prev.up - cur.up) * 1000 > DROP_SLACK_MS;
    const elapsed = cur.t - prev.t;
    const belowElapsed = cur.up * 1000 < elapsed - ELAPSED_SLACK_MS;
    if (dropped || belowElapsed) out.push({ index: i, at: Math.max(prev.t, cur.t - cur.up * 1000) });
  }
  return out;
}
