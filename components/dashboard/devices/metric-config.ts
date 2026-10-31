import type { DeviceTelemetryPoint } from "@/lib/types";
import { THRESHOLDS, type Thresholds } from "./telemetry-utils";

/** A series with at least this many non-null points is charted; with 0 or 1 it is a tile. */
export const MIN_CHART_POINTS = 2;

export interface SeriesConfig {
  id: "temp_cpu" | "temp_npu" | "cpu" | "memory" | "disk" | "wifi";
  label: string;
  /** Column name in the CSV export. */
  csv: string;
  color: string;
  hourly: (p: DeviceTelemetryPoint) => number | null;
}

export interface ChartConfig {
  id: string;
  title: string;
  unit: string;
  decimals: number;
  /** padded: min-5 .. max+5. zero: 0 .. max(25, max*1.3). full: 0..100 (limits visible). */
  yMode: "padded" | "zero" | "full";
  thresholds: Thresholds;
  /** Values below this are clamped (no negative temperature / percent). */
  clampMin?: number;
  series: SeriesConfig[];
}

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export const CHARTS: ChartConfig[] = [
  {
    id: "temperature",
    title: "Temperature",
    unit: "°C",
    decimals: 1,
    yMode: "padded",
    thresholds: THRESHOLDS.temp,
    clampMin: 0,
    series: [
      { id: "temp_cpu", csv: "cpu_temp_c", label: "CPU", color: "hsl(2, 78%, 56%)", hourly: (p) => num(p.avg_temp) },
      { id: "temp_npu", csv: "npu_temp_c", label: "NPU", color: "hsl(188, 90%, 42%)", hourly: (p) => num(p.npu_temp_celsius) },
    ],
  },
  {
    id: "cpu",
    title: "CPU",
    unit: "%",
    decimals: 1,
    yMode: "zero",
    thresholds: THRESHOLDS.percent,
    clampMin: 0,
    series: [{ id: "cpu", csv: "cpu_pct", label: "CPU", color: "hsl(224, 85%, 62%)", hourly: (p) => num(p.avg_cpu) }],
  },
  {
    id: "memory",
    title: "Memory",
    unit: "%",
    decimals: 1,
    yMode: "zero",
    thresholds: THRESHOLDS.percent,
    clampMin: 0,
    series: [{ id: "memory", csv: "memory_pct", label: "Memory", color: "hsl(160, 84%, 39%)", hourly: (p) => num(p.avg_memory) }],
  },
  {
    id: "disk",
    title: "Disk used",
    unit: "%",
    decimals: 1,
    yMode: "full",
    thresholds: THRESHOLDS.percent,
    clampMin: 0,
    series: [{ id: "disk", csv: "disk_pct", label: "Disk", color: "hsl(280, 60%, 60%)", hourly: (p) => num(p.disk_percent) }],
  },
  {
    id: "wifi",
    title: "Wi-Fi signal",
    unit: " dBm",
    decimals: 0,
    yMode: "padded",
    thresholds: THRESHOLDS.wifi,
    series: [{ id: "wifi", csv: "wifi_dbm", label: "Wi-Fi", color: "hsl(330, 80%, 60%)", hourly: (p) => num(p.wifi_rssi_dbm) }],
  },
];

/** Decimals for a series id: the one rule for how a metric's number is written (Vitals and chart header alike). */
export const decimalsOf = (id: string) => CHARTS.find((c) => c.series.some((s) => s.id === id))?.decimals ?? 0;

/** Uptime & restarts: not a status metric, so it has no limits; its hue is not used by any other card. */
export const UPTIME_CHART = {
  id: "uptime",
  title: "Uptime & restarts",
  seriesId: "uptime",
  color: "hsl(24, 90%, 54%)",
} as const;
