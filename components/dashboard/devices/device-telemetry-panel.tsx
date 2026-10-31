"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Activity, Download, Radio, RefreshCw, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDeviceLiveHistoryAction,
  getDeviceLiveVitalsAction,
  getDeviceTelemetryHistoryAction,
} from "@/lib/actions/device.actions";
import { EventsCard } from "./events-card";
import { CARD, SectionTitle, SubTitle } from "./section";
import { DetectionTimeline, type DetectionTimelineData } from "./detection-timeline";
import { AvailabilityStrip } from "./availability-strip";
import { DetectionCard, type DetectionInfo } from "./detection-card";
import { StatusDot } from "./status-dot";
import { toast } from "sonner";
import { VitalTiles, VitalTilesSkeleton, type Vital } from "./vital-tiles";
import { CHARTS, decimalsOf, MIN_CHART_POINTS, UPTIME_CHART } from "./metric-config";
import { Ago, refreshNow, setSharedLastSeen, SourceTag, useSharedLastSeen } from "./relative-time";
import { computeHealth, type HealthMetric } from "./health-summary";
import type { Pt, SeriesData } from "./metric-card";
import {
  buildStripCells,
  buildTimeAxis,
  deriveEvents,
  cleanUptimePoints,
  detectRestarts,
  findOfflineGaps,
  formatGapTime,
  HOUR_MS,
  RANGE_HOURS,
  statusOf,
  summarize,
  THRESHOLDS,
  type TelemetryEvent,
  type Thresholds,
  type UptimePoint,
} from "./telemetry-utils";
import type {
  DeviceLiveHistorySample,
  DeviceLiveResult,
  DeviceLiveSample,
  DevicePipelineStatus,
  DeviceTelemetryPoint,
  TelemetryRange,
} from "@/lib/types";

// recharts is heavy and only needed once history has loaded, so keep it out of the page bundle.
const MetricCard = dynamic(() => import("./metric-card").then((m) => m.MetricCard), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted/40" />,
});

const NO_POINTS: DeviceTelemetryPoint[] = [];
const RANGES: TelemetryRange[] = ["24h", "7d", "30d"];

function formatUptime(seconds: number | null) {
  if (seconds === null || seconds === undefined) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatNetwork(type: string | null, rssi: number | null) {
  if (!type) return "—";
  const t = type.toLowerCase();
  if (t.includes("wi")) return rssi !== null ? `Wi-Fi, ${rssi} dBm` : "Wi-Fi";
  if (t.includes("eth")) return "Ethernet";
  return type;
}

/** Safe readers for the loosely-typed `extra` blob the device sends with a live check. */
const asNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const asString = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);
const asBool = (v: unknown) => (typeof v === "boolean" ? v : null);
const asRecord = (v: unknown) =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

function formatLoad(v: unknown) {
  const n = asNumber(v);
  if (n !== null) return n.toFixed(2);
  if (Array.isArray(v)) {
    const nums = v.map(asNumber).filter((x): x is number => x !== null);
    return nums.length > 0 ? nums.map((x) => x.toFixed(2)).join(" / ") : null;
  }
  return asString(v);
}

const isPipeline = (s: unknown): s is DevicePipelineStatus =>
  s === "running" || s === "idle_no_camera" || s === "stopped";

const hueOf = (id: string) => CHARTS.flatMap((c) => c.series).find((s) => s.id === id)?.color ?? "currentColor";

/** Mount with `key={deviceId}` so live/history state resets per device. */
export function DeviceTelemetryPanel({
  deviceId,
  online,
  lastSeenAt,
  inventoryStatus,
}: {
  deviceId: string;
  /** Presence state from the device record, used until a live check says otherwise. */
  online: boolean;
  lastSeenAt: string | null;
  inventoryStatus?: string;
}) {
  // "24h / 7d / 30d" = the last 24 / 168 / 720 hours the device HAD DATA (offline time doesn't count),
  // so the 30d history is fetched once and the range is just a slice of it.
  const [range, setRange] = React.useState<TelemetryRange>("24h");
  const [historyResult, setHistoryResult] = React.useState<{
    points: DeviceTelemetryPoint[];
    liveSamples: DeviceLiveSample[];
    windowEnd: number;
    error: string | null;
  } | null>(null);
  const historyLoading = historyResult === null;
  const historyError = historyResult?.error ?? null;

  // Bumped after a successful live check so the new sample shows up in the charts.
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [recentChecks, setRecentChecks] = React.useState<DeviceLiveHistorySample[]>([]);
  const [checksLoaded, setChecksLoaded] = React.useState(false);

  const [live, setLive] = React.useState<DeviceLiveResult | null>(null);
  const [liveLoading, setLiveLoading] = React.useState(false);
  const [liveError, setLiveError] = React.useState<string | null>(null);

  // Re-renders the relative-time labels only ("updated 2m ago"); it never refetches data.
  // One shared "now" and one "last seen" per device (see relative-time.tsx): every card reads these.
  const lastSeenIso = useSharedLastSeen(deviceId, lastSeenAt);
  React.useEffect(() => {
    refreshNow();
  }, []);
  React.useEffect(() => {
    if (!live) return;
    const id = setInterval(refreshNow, 30_000);
    return () => clearInterval(id);
  }, [live]);

  React.useEffect(() => {
    let cancelled = false;
    getDeviceTelemetryHistoryAction(deviceId, "30d").then((res) => {
      if (cancelled) return;
      const windowEnd = Date.now();
      setHistoryResult(
        res.success && res.data
          ? {
              points: res.data.metrics,
              liveSamples: res.data.live_samples ?? [],
              windowEnd,
              error: null,
            }
          : { points: [], liveSamples: [], windowEnd, error: res.error || "Failed to load history" }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId, refreshKey]);

  React.useEffect(() => {
    let cancelled = false;
    getDeviceLiveHistoryAction(deviceId, 50).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setRecentChecks(res.data.samples);
      setChecksLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId, refreshKey]);

  const checkLive = async () => {
    setLiveLoading(true);
    setLiveError(null);
    const res = await getDeviceLiveVitalsAction(deviceId);
    if (res.success && res.data) {
      setLive(res.data);
      refreshNow();
      setSharedLastSeen(deviceId, res.data.status === "LIVE" ? res.data.recorded_at : res.data.last_seen_at);
      if (res.data.status === "LIVE") {
        setRefreshKey((k) => k + 1);
        toast.success("Live data updated", { duration: 2000 });
      } else if (res.data.status === "OFFLINE") {
        toast.error("Device is offline", { icon: <WifiOff className="size-4" /> });
      } else {
        toast.warning("Device did not respond");
      }
    } else {
      setLiveError(res.error || "Failed to fetch live data");
      toast.error(res.error || "Failed to fetch live data");
    }
    setLiveLoading(false);
  };

  // The selected hourly rows: the last N hours that have data.
  const history = React.useMemo(
    () =>
      [...(historyResult?.points ?? NO_POINTS)]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-RANGE_HOURS[range]),
    [historyResult, range]
  );

  // Everything below is derived from the selected rows plus the live readings inside that span.
  const model = React.useMemo(() => {
    if (!historyResult || historyResult.error) return null;
    const firstT = history.length > 0 ? new Date(history[0].timestamp).getTime() : -Infinity;
    const inSpan = (t: number) => t >= firstT;

    // One source per metric: the live value when a live check exists in this session, else the latest stored point.
    const lv = live?.status === "LIVE" ? live : null;
    const liveVals: Record<string, number | null> = lv
      ? {
          temp_cpu: lv.vitals.temperature_celsius,
          cpu: lv.vitals.cpu_percent,
          memory: lv.vitals.memory_percent,
          disk: lv.vitals.disk_percent,
          wifi: lv.vitals.wifi_rssi_dbm,
          temp_npu: asNumber(asRecord(lv.extra)?.npu_temp_celsius),
          uptime: lv.vitals.uptime_seconds,
        }
      : {};
    const liveT = lv ? new Date(lv.recorded_at).getTime() : 0;

    // Live readings: live_samples carry temp/cpu/memory/disk; the live-history rows add NPU temp and Wi-Fi.
    const toPts = <T,>(items: T[], at: (i: T) => string, val: (i: T) => number | null) =>
      items.flatMap((i) => {
        const v = val(i);
        const t = new Date(at(i)).getTime();
        return v !== null && inSpan(t) ? [{ t, v, src: "live" as const }] : [];
      });
    const liveBy: Record<string, { t: number; v: number; src: "hourly" | "live" }[]> = {
      temp_cpu: toPts(historyResult.liveSamples, (x) => x.recorded_at, (x) => x.temp),
      cpu: toPts(historyResult.liveSamples, (x) => x.recorded_at, (x) => x.cpu),
      memory: toPts(historyResult.liveSamples, (x) => x.recorded_at, (x) => x.memory),
      disk: toPts(historyResult.liveSamples, (x) => x.recorded_at, (x) => x.disk),
      temp_npu: toPts(recentChecks, (x) => x.recorded_at, (x) => asNumber(asRecord(x.extra)?.npu_temp_celsius)),
      wifi: toPts(recentChecks, (x) => x.recorded_at, (x) => x.wifi_rssi_dbm),
      uptime: toPts(historyResult.liveSamples, (x) => x.recorded_at, (x) => x.uptime_seconds),
    };
    // The same live check can appear in both lists: keep one uptime reading per timestamp.
    const seenUp = new Set(liveBy.uptime.map((p) => p.t));
    for (const p of toPts(recentChecks, (x) => x.recorded_at, (x) => x.uptime_seconds))
      if (!seenUp.has(p.t)) liveBy.uptime.push(p);

    // Offline gaps and the shared compressed axis (data points only; each gap > 3h is a narrow marker).
    const hourStarts = history.map((p) => Math.floor(new Date(p.timestamp).getTime() / HOUR_MS) * HOUR_MS);
    const liveTimes = [
      ...historyResult.liveSamples.map((x) => new Date(x.recorded_at).getTime()),
      ...recentChecks.map((x) => new Date(x.recorded_at).getTime()),
    ].filter(inSpan);
    const gaps = findOfflineGaps(hourStarts, liveTimes, historyResult.windowEnd);
    const allTimes = [...history.map((p) => new Date(p.timestamp).getTime()), ...Object.values(liveBy).flat().map((p) => p.t)];
    const axis = buildTimeAxis(allTimes, gaps);

    const charts: { cfg: (typeof CHARTS)[number]; series: SeriesData[] }[] = [];
    const tiles: {
      key: string;
      title: string;
      unit: string;
      decimals: number;
      thresholds: Thresholds;
      current: { v: number } | null;
      ago: React.ReactNode;
    }[] = [];

    const exportSeries: { csv: string; points: Pt[] }[] = [];
    const latest: Record<string, { v: number; t: number }> = {};
    const spark: Record<string, number[]> = {};
    const healthMetrics: (HealthMetric & { id: string })[] = [];

    for (const cfg of CHARTS) {
      const clamp = (v: number) => (cfg.clampMin !== undefined ? Math.max(cfg.clampMin, v) : v);
      const shown: SeriesData[] = [];
      for (const sc of cfg.series) {
        // One time-sorted series per metric: hourly points and live readings are all real points on the line.
        const hourly = history.flatMap((p) => {
          const v = sc.hourly(p);
          return v !== null ? [{ t: new Date(p.timestamp).getTime(), v, src: "hourly" as const }] : [];
        });
        const points: Pt[] = [...hourly, ...(liveBy[sc.id] ?? [])]
          .sort((a, b) => a.t - b.t)
          .map((p) => ({ t: p.t, x: axis.toX(p.t), v: clamp(p.v), src: p.src }));
        const last = points.length > 0 ? points[points.length - 1] : null;
        const lvVal = liveVals[sc.id];
        const isLive = lvVal !== null && lvVal !== undefined;
        const current: Pt | null = isLive ? { t: liveT, x: last?.x ?? 0, v: clamp(lvVal), src: "live" } : last;
        const ago = current ? <SourceTag live={isLive} at={isLive ? lv!.recorded_at : current.t} /> : null;

        exportSeries.push({ csv: sc.csv, points });
        if (current) latest[sc.id] = { v: current.v, t: current.t };
        spark[sc.id] = points.slice(-48).map((p) => p.v);
        const stats = summarize(points.map((p) => p.v));
        healthMetrics.push({
          id: sc.id,
          name: cfg.series.length > 1 ? `${cfg.title} (${sc.label})` : cfg.title,
          unit: cfg.unit,
          decimals: cfg.decimals,
          thresholds: cfg.thresholds,
          current: current ? current.v : null,
          worst: stats ? (cfg.thresholds.lowerIsWorse ? stats.min : stats.max) : null,
        });

        if (points.length >= MIN_CHART_POINTS) {
          shown.push({
            id: sc.id,
            label: sc.label,
            color: sc.color,
            points,
            current,
            currentAgo: ago,
            stats,
          });
        } else {
          // 0 or 1 points: nothing to draw, so show the value (if any) as a tile.
          tiles.push({
            key: sc.id,
            title: cfg.series.length > 1 ? `${cfg.title} (${sc.label})` : cfg.title,
            unit: cfg.unit,
            decimals: cfg.decimals,
            thresholds: cfg.thresholds,
            current,
            ago,
          });
        }
      }
      // A Disk series that never changed is just a straight line: the Vitals tile already shows it.
      const flatDisk =
        cfg.id === "disk" && shown.length === 1 && shown[0].stats !== null && shown[0].stats.max - shown[0].stats.min < 0.05;
      if (shown.length > 0 && !flatDisk) charts.push({ cfg, series: shown });
    }

    // Uptime & restarts: uptime in seconds from hourly rows plus live readings, in the unit that fits.
    const upSorted: UptimePoint[] = [
      ...history.flatMap((p) =>
        typeof p.uptime_seconds === "number" && Number.isFinite(p.uptime_seconds)
          ? [{ t: new Date(p.timestamp).getTime(), up: p.uptime_seconds, src: "hourly" as const }]
          : []
      ),
      ...liveBy.uptime.map((p) => ({ t: p.t, up: p.v, src: "live" as const })),
    ].sort((a, b) => a.t - b.t);
    const upRaw = cleanUptimePoints(upSorted);
    let uptime: {
      series: SeriesData[];
      restartX: Set<number>;
      format: (v: number) => string;
      yTickFormat: (v: number) => string;
      detail: string;
      currentSec: number;
    } | null = null;
    const restartEvents: TelemetryEvent[] = [];
    if (upRaw.length >= MIN_CHART_POINTS) {
      const maxUp = Math.max(...upRaw.map((p) => p.up));
      const unit = maxUp < 7200 ? { name: "m", sec: 60 } : maxUp < 72 * 3600 ? { name: "h", sec: 3600 } : { name: "d", sec: 86400 };
      const restarts = detectRestarts(upRaw);
      const points: Pt[] = upRaw.map((p) => ({ t: p.t, x: axis.toX(p.t), v: p.up / unit.sec, src: p.src }));
      const lastPt = points[points.length - 1];
      const upLive = liveVals.uptime;
      const upIsLive = upLive !== null && upLive !== undefined;
      const cur: Pt = upIsLive ? { t: liveT, x: lastPt.x, v: upLive / unit.sec, src: "live" } : lastPt;
      const boot = cur.t - cur.v * unit.sec * 1000;
      const n = restarts.length;
      uptime = {
        series: [
          {
            id: UPTIME_CHART.seriesId,
            label: "Uptime",
            color: UPTIME_CHART.color,
            points,
            current: cur,
            currentAgo: <SourceTag live={upIsLive} at={upIsLive ? lv!.recorded_at : cur.t} />,
            stats: null,
          },
        ],
        restartX: new Set(restarts.map((r) => points[r.index].x)),
        format: (v) => formatUptime(v * unit.sec),
        yTickFormat: (v) => `${+v.toFixed(1)}${unit.name}`,
        currentSec: cur.v * unit.sec,
        detail: `Last restart ${formatGapTime(boot)} - ${n === 0 ? "no restarts" : n === 1 ? "1 restart" : `${n} restarts`} in this range`,
      };
      for (const r of restarts) restartEvents.push({ t: r.at, kind: "restart", text: "Device restarted" });
    }

    // Detection timeline: one status per hour. Null is "not recorded", never "stopped".
    const stripCells = buildStripCells(history, gaps);
    const withStatus = history.filter((p) => p.pipeline_status);
    const PIPE_WORDS: Record<string, string> = { running: "Detection started", idle_no_camera: "No camera connected", stopped: "Detection stopped" };
    let detectionTimeline: DetectionTimelineData | null = null;
    let detectionSince: { state: string; since: number } | null = null;
    if (withStatus.length >= 2) {
      const changes: { t: number; text: string }[] = [];
      let prev: string | null = null;
      for (const p of withStatus) {
        if (prev !== null && p.pipeline_status !== prev) {
          const n = p.cameras_configured;
          changes.push({
            t: new Date(p.timestamp).getTime(),
            text: `${PIPE_WORDS[p.pipeline_status!] ?? p.pipeline_status}${n !== null ? ` (${n} camera${n === 1 ? "" : "s"} configured)` : ""}`,
          });
        }
        prev = p.pipeline_status;
      }
      const cameraHours = withStatus.filter((p) => p.pipeline_status === "running" || p.pipeline_status === "stopped");
      detectionTimeline = {
        cells: stripCells,
        counted: cameraHours.length,
        running: cameraHours.filter((p) => p.pipeline_status === "running").length,
        changes: changes.slice(-5).reverse(),
        maxCameras: Math.max(0, ...history.map((p) => p.cameras_configured ?? 0)),
      };
    } else if (withStatus.length === 1) {
      detectionSince = { state: withStatus[0].pipeline_status!, since: new Date(withStatus[0].timestamp).getTime() };
    }
    // Trailing run of hourly "stopped" statuses (nulls skipped): a fault only after 2 or more in a row.
    let stoppedRun = 0;
    for (let i = withStatus.length - 1; i >= 0 && withStatus[i].pipeline_status === "stopped"; i--) stoppedRun++;

    // Data coverage: data hours / hours elapsed since the first selected data hour.
    const elapsedHours = history.length > 0 ? Math.max(1, Math.ceil((historyResult.windowEnd - firstT) / HOUR_MS)) : 0;
    const coverage = elapsedHours > 0 ? Math.min(100, (new Set(hourStarts).size / elapsedHours) * 100) : null;

    const latestPipeline = [...history].reverse().find((p) => p.pipeline_status)?.pipeline_status ?? null;

    return {
      gaps,
      axis,
      charts,
      tiles,
      coverage,
      stripCells,
      detectionTimeline,
      detectionSince,
      stoppedRun,
      exportSeries,
      latest,
      spark,
      healthMetrics,
      latestPipeline,
      uptime,
      events: deriveEvents(history, gaps, historyResult.windowEnd, restartEvents),
    };
  }, [historyResult, history, recentChecks, live]);

  const coverage = model?.coverage ?? null;
  const charts = model?.charts ?? [];
  const tiles = model?.tiles ?? [];
  const events = model?.events ?? [];

  const liveOk = live?.status === "LIVE";
  const vitals = live?.status === "LIVE" ? live.vitals : null;
  const cameraHealth =
    live?.status === "LIVE" && live.camera_health ? Object.entries(live.camera_health) : [];
  const latestCheck = recentChecks[0] ?? null;
  // Live extras when there is a live result, else the extras of the latest stored check.
  const extra = live?.status === "LIVE" ? live.extra : asRecord(latestCheck?.extra);
  const memoryExtra = asRecord(extra?.memory);
  const memUsedMb = asNumber(memoryExtra?.used_mb);
  const memTotalMb = asNumber(memoryExtra?.total_mb);
  const diskFreeMb = asNumber(extra?.disk_free_mb);
  const load = formatLoad(extra?.load);
  const wifiSsid = asString(extra?.wifi_ssid);
  const cloudflared = asBool(extra?.cloudflared_running);
  const npuTemp = asNumber(extra?.npu_temp_celsius);
  const npuState = asString(extra?.npu_state);

  // --- Device state ---
  const statusOnline = live ? live.status !== "OFFLINE" : online;
  // Uptime shown here is the chart header's number (live value, else latest stored point): one source.
  const kpiUptime = model?.uptime?.currentSec ?? vitals?.uptime_seconds ?? latestCheck?.uptime_seconds ?? null;
  const kpiFirmware =
    vitals?.firmware_version ?? recentChecks.find((c) => c.firmware_version)?.firmware_version ?? null;
  // --- Current vitals: the live result when there is one, else the latest stored values ---
  const stored = model?.latest ?? {};
  // One time for "when these values were reported": the device's single last-seen moment.
  const storedNewest = Math.max(-Infinity, ...Object.values(stored).map((p) => p.t));
  const reportedAt = lastSeenIso ?? (Number.isFinite(storedNewest) ? storedNewest : null);
  const source = (id: string, liveValue: number | null | undefined) =>
    liveOk ? { v: liveValue ?? null } : { v: stored[id] ? stored[id].v : null };
  const vitalTiles: Vital[] = [];
  const diskFreeGb = diskFreeMb !== null ? diskFreeMb / 1024 : null;
  let diskTotalGb: number | null = null;
  if (model || liveOk) {
    const T = THRESHOLDS;
    const push = (
      id: string,
      label: string,
      src: ReturnType<typeof source>,
      unit: string,
      thresholds: (typeof THRESHOLDS)[keyof typeof THRESHOLDS],
      visual: (v: number) => Vital["visual"],
      detail?: string
    ) => {
      if (src.v === null) return;
      vitalTiles.push({
        id,
        label,
        display: src.v.toFixed(decimalsOf(id)),
        unit,
        color: hueOf(id),
        status: statusOf(src.v, thresholds),
        caption: detail,
        visual: visual(src.v),
      });
    };
    const spark = (id: string) => (): Vital["visual"] => ({ kind: "spark", values: model?.spark[id] ?? [] });
    const bar = (v: number): Vital["visual"] => ({ kind: "bar", pct: v, marks: [T.percent.warn, T.percent.crit] });
    const cpuTemp = source("temp_cpu", vitals?.temperature_celsius);
    push("temp_cpu", "CPU temp", cpuTemp, "°C", T.temp, spark("temp_cpu"),
      vitals?.temperature_avg_celsius != null ? `hottest zone, avg ${vitals.temperature_avg_celsius.toFixed(1)}°C` : "hottest zone");
    push("temp_npu", "AI chip temp", source("temp_npu", npuTemp), "°C", T.temp, spark("temp_npu"),
      npuState ? `Chip ${npuState.toLowerCase() === "running" ? "on and ready" : npuState}` : undefined);
    push("cpu", "CPU", source("cpu", vitals?.cpu_percent), "%", T.percent, spark("cpu"));
    push("memory", "Memory", source("memory", vitals?.memory_percent), "%", T.percent, bar,
      memUsedMb !== null && memTotalMb !== null ? `${Math.round(memUsedMb)} of ${Math.round(memTotalMb)} MB` : undefined);
    const disk = source("disk", vitals?.disk_percent);
    if (disk.v !== null && disk.v < 100 && diskFreeGb !== null) diskTotalGb = diskFreeGb / (1 - disk.v / 100);
    push("disk", "Disk", disk, "% used", T.percent, bar,
      diskFreeGb !== null ? `${diskFreeGb.toFixed(1)} GB free` : undefined);
    const wifi = source("wifi", vitals?.wifi_rssi_dbm);
    push("wifi", "Wi-Fi", wifi, "dBm", T.wifi,
      (v) => ({ kind: "signal", bars: v > -55 ? 4 : v > -65 ? 3 : v > -75 ? 2 : 1 }),
      wifi.v !== null ? `${statusOf(wifi.v, T.wifi) === "ok" ? "Good" : statusOf(wifi.v, T.wifi) === "warn" ? "Fair" : "Weak"} signal` : undefined);
  }
  const vitalNotes: { label: string; value: string }[] = [];
  const networkType = vitals?.network_type ?? latestCheck?.network_type ?? null;
  if (networkType) vitalNotes.push({ label: "Network", value: formatNetwork(networkType, null) });
  if (wifiSsid) vitalNotes.push({ label: "Wi-Fi name", value: wifiSsid });
  if (load !== null) vitalNotes.push({ label: "Load", value: load });
  if (cloudflared !== null) vitalNotes.push({ label: "Remote access", value: cloudflared ? "Available" : "Off" });
  // Extra detail line shown under a chart's values.
  const chartDetail: Record<string, string | undefined> = {
    cpu: load !== null ? `Load ${load}` : undefined,
    disk:
      diskFreeGb !== null
        ? `${diskFreeGb.toFixed(1)} GB free${diskTotalGb !== null ? ` of about ${diskTotalGb.toFixed(0)} GB` : ""}`
        : undefined,
    wifi: wifiSsid ? `Connected to ${wifiSsid}` : undefined,
  };

  // --- Detection card: live result when there is one, else the last stored check / hourly row ---
  const pipelineRaw = vitals?.pipeline_status ?? model?.latestPipeline ?? latestCheck?.pipeline_status ?? null;
  const pipeline = isPipeline(pipelineRaw) ? pipelineRaw : null;
  const storedCameras = latestCheck?.camera_health ? Object.entries(latestCheck.camera_health) : null;
  const detection: DetectionInfo = {
    pipeline,
    cameras: liveOk ? cameraHealth : storedCameras,
    npuState,
    source: reportedAt !== null ? <>Last checked <Ago at={reportedAt} /></> : pipeline ? "From the latest hourly report" : null,
  };

  // --- Verdict: latest live result + thresholds over the visible range ---
  const liveCurrent: Record<string, number | null> = {
    temp_cpu: vitals?.temperature_celsius ?? null,
    temp_npu: liveOk ? npuTemp : null,
    cpu: vitals?.cpu_percent ?? null,
    memory: vitals?.memory_percent ?? null,
    disk: vitals?.disk_percent ?? null,
    wifi: vitals?.wifi_rssi_dbm ?? null,
  };
  // "Stopped" is a fault only after 2 or more consecutive stopped hours (a live reading counts as one more).
  const hourlyStopped = model?.stoppedRun ?? 0;
  const stoppedHours = liveOk ? (vitals?.pipeline_status === "stopped" ? hourlyStopped + 1 : 0) : hourlyStopped;
  const pipelineForVerdict = pipeline === "stopped" && stoppedHours < 2 ? null : pipeline;
  const healthReasons = computeHealth({
    online: statusOnline,
    live,
    pipelineStatus: pipelineForVerdict,
    unreachableCameras: liveOk ? cameraHealth.filter(([, ok]) => ok !== true).map(([id]) => id) : [],
    metrics: (model?.healthMetrics ?? []).map((m) => ({ ...m, current: liveCurrent[m.id] ?? m.current })),
  });
  const healthTop = healthReasons[0] ?? null;
  const hasAnyReading = (model?.healthMetrics ?? []).some((m) => m.current !== null) || vitals !== null;
  // Skeletons hold the final layout until BOTH history and the stored checks have arrived, so nothing shifts.
  const ready = !historyLoading && checksLoaded;
  const showSkeleton = !ready && !historyError;
  const verdictReady = ready || live !== null || !online;
  // The data the verdict rests on was reported at the device's single last-seen moment.
  const dataAt = reportedAt;
  const waitingForCamera = inventoryStatus === "INSTALLED" && pipeline === "idle_no_camera";
  const verdict = !statusOnline
    ? { label: "Offline", variant: "destructive" as const, status: "crit" as const }
    : live?.status === "NO_RESPONSE"
      ? { label: "Not responding", variant: "warning" as const, status: "warn" as const }
      : healthTop?.severity === "crit"
        ? { label: "Needs attention", variant: "destructive" as const, status: "crit" as const }
        : healthTop
          ? { label: "Keep an eye on it", variant: "warning" as const, status: "warn" as const }
          : {
              label: "Healthy",
              variant: "success" as const,
              status: "ok" as const,
            };
  const checked =
    statusOnline && live?.status !== "NO_RESPONSE" && dataAt !== null ? (
      <>
        , checked <Ago at={dataAt} />
      </>
    ) : null;
  const verdictReason: React.ReactNode = !statusOnline ? (
    lastSeenIso ? (
      <>
        Last seen <Ago at={lastSeenIso} />
      </>
    ) : (
      "Never seen"
    )
  ) : healthTop ? (
    <>
      {healthTop.text}
      {healthReasons.length > 1 ? ` (+${healthReasons.length - 1} more)` : ""}
      {checked}
    </>
  ) : hasAnyReading ? (
    <>
      All readings normal{waitingForCamera ? ", waiting for a camera" : ""}
      {checked}
    </>
  ) : (
    "No readings recorded yet."
  );

  // --- CSV export of the merged series in the selected range (one row per timestamp) ---
  const exportCsv = () => {
    if (!model) return;
    const byT = new Map<number, { vals: Record<string, number>; src: Set<string> }>();
    for (const s of model.exportSeries) {
      for (const p of s.points) {
        const row = byT.get(p.t) ?? { vals: {}, src: new Set<string>() };
        row.vals[s.csv] = Number(p.v.toFixed(2));
        row.src.add(p.src);
        byT.set(p.t, row);
      }
    }
    const cols = model.exportSeries.map((s) => s.csv);
    const lines = [["time_iso", "source", ...cols].join(",")];
    for (const t of [...byT.keys()].sort((a, b) => a - b)) {
      const row = byT.get(t)!;
      lines.push([new Date(t).toISOString(), [...row.src].join("+"), ...cols.map((c) => row.vals[c] ?? "")].join(","));
    }
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(lines.join("\n"))}`;
    a.download = `${deviceId}_telemetry_${range}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const canExport = (model?.exportSeries ?? []).some((s) => s.points.length > 0);

  // Uptime sits beside Wi-Fi; without Wi-Fi it pairs with the previous card, or spans the row if alone in it.
  const uptimeWide =
    !!model?.uptime &&
    !charts.some((c) => c.cfg.id === "wifi") &&
    (charts.filter((c) => c.cfg.id !== "temperature").length + 1) % 2 === 1;

  const stateItems: { label: string; value: React.ReactNode }[] = [
    { label: "Status", value: statusOnline ? "Online" : "Offline" },
  ];
  stateItems.push({ label: "Last seen", value: lastSeenIso ? <Ago at={lastSeenIso} /> : "Never" });
  if (statusOnline && kpiUptime !== null) stateItems.push({ label: "Uptime", value: formatUptime(kpiUptime) });
  if (kpiFirmware) stateItems.push({ label: "Firmware", value: <span className="font-mono">{kpiFirmware}</span> });
  if (showSkeleton) {
    const bar = <span className="inline-block h-4 w-14 animate-pulse rounded bg-muted/50 align-middle" />;
    if (online && !stateItems.some((i) => i.label === "Uptime")) stateItems.push({ label: "Uptime", value: bar });
    if (!kpiFirmware) stateItems.push({ label: "Firmware", value: bar });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={Activity}>Health Telemetry</SectionTitle>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={checkLive} disabled={liveLoading}>
          {liveLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
          {liveLoading ? "Checking device..." : live ? "Refresh Live Data" : "Check Live Data"}
        </Button>
      </div>

      {/* 1-2-4: verdict, device state, reporting timeline, detection */}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          {verdictReady ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Badge variant={verdict.variant}>{verdict.label}</Badge>
              <span className="text-sm text-muted-foreground">{verdictReason}</span>
            </div>
          ) : (
            <div className="h-6 w-2/3 animate-pulse rounded-full bg-muted/50" />
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {stateItems.map((i) => (
              <div key={i.label} className="flex flex-col gap-0.5">
                <dt className="text-[11px] text-muted-foreground">{i.label}</dt>
                <dd className="text-sm text-foreground">{i.value}</dd>
              </div>
            ))}
          </dl>

          {showSkeleton ? (
            <div className="flex flex-col gap-1.5">
              <div className="h-3 animate-pulse rounded-full bg-muted/50" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/40" />
            </div>
          ) : (
            model && model.stripCells.length > 0 && <AvailabilityStrip cells={model.stripCells} coverage={coverage} rangeLabel={range} />
          )}
        </div>
        <DetectionCard info={detection} loading={showSkeleton} />
      </div>

      {/* Live check (on demand) */}
      {liveError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {liveError}
        </div>
      )}
      {live?.status === "NO_RESPONSE" && (
        <div className={`${CARD} flex items-center justify-between gap-2 py-3 text-sm`}>
          <span className="flex flex-wrap items-center gap-x-2">
            <StatusDot status="warn" />
            <span className="font-medium text-foreground">Device is online but did not respond</span>
            <span className="text-muted-foreground">
              · {lastSeenIso ? <>last seen <Ago at={lastSeenIso} /></> : "never seen"}
            </span>
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={checkLive} disabled={liveLoading}>
            Retry
          </Button>
        </div>
      )}

      {(vitalTiles.length > 0 || showSkeleton) && (
        <section className="flex flex-col gap-3">
          <SubTitle
            right={
              vitalTiles.length > 0 && (
              <span className="text-xs">
                <SourceTag badge live={live?.status === "LIVE"} at={live?.status === "LIVE" ? live.recorded_at : Number.isFinite(storedNewest) ? storedNewest : null} />
              </span>
              )
            }
          >
            Vitals
          </SubTitle>
          {vitalTiles.length > 0 ? <VitalTiles vitals={vitalTiles} busy={liveLoading} /> : <VitalTilesSkeleton />}
          {vitalNotes.length > 0 && (
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              {vitalNotes.map((d) => (
                <div key={d.label} className="flex gap-1.5">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="text-foreground">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {/* 3: history */}
      <section className="flex flex-col gap-3">
        <SubTitle
          right={
            <div className="flex items-center gap-1">
              {RANGES.map((r) => (
                <Button
                  key={r}
                  variant={r === range ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  title={`Last ${RANGE_HOURS[r]} hours of data (offline time is not counted)`}
                  onClick={() => setRange(r)}
                >
                  {r}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-7 gap-1.5 px-2.5 text-xs"
                onClick={exportCsv}
                disabled={!canExport}
                title="Download the merged series in this range as CSV"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          }
        >
          History
        </SubTitle>

        {showSkeleton ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-busy>
            {[true, false, false, false, false, true].map((wide, i) => (
              <div
                key={i}
                className={`h-[316px] animate-pulse rounded-xl border border-border bg-muted/30 ${wide ? "lg:col-span-2" : ""}`}
              />
            ))}
          </div>
        ) : historyError ? (
          <p className="py-8 text-center text-sm text-rose-600 dark:text-rose-400">{historyError}</p>
        ) : model === null || (charts.length === 0 && tiles.every((t) => t.current === null)) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No telemetry recorded in this range.</p>
        ) : (
          <>
            {(charts.length > 0 || model.uptime || model.detectionTimeline || model.detectionSince) && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {charts.map(({ cfg, series }, idx) => {
                  // Temperature (two series) takes a full row. Wi-Fi and Uptime always share the last row;
                  // everything before them pairs up in order, and an odd one out spans its row.
                  const pairTail = model.uptime !== null && charts.some((c) => c.cfg.id === "wifi");
                  const flow = charts
                    .filter((c) => c.cfg.id !== "temperature" && !(pairTail && c.cfg.id === "wifi"))
                    .map((c) => c.cfg.id as string);
                  if (!pairTail && model.uptime) flow.push("uptime");
                  const oddLast = flow.length % 2 === 1 ? flow[flow.length - 1] : null;
                  const wide = cfg.id === "temperature" || oddLast === cfg.id;
                  return (
                    <div
                      key={cfg.id}
                      className={`flex animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards motion-reduce:animate-none [&>*]:w-full ${wide ? "lg:col-span-2" : ""}`}
                      style={{ animationDelay: `${idx * 70}ms` }}
                    >
                      <MetricCard
                        title={cfg.title}
                        unit={cfg.unit}
                        decimals={cfg.decimals}
                        yMode={cfg.yMode}
                        thresholds={cfg.thresholds}
                        series={series}
                        axis={model.axis}
                        detail={chartDetail[cfg.id]}
                      />
                    </div>
                  );
                })}
                {/* Uptime & restarts always takes its own full row, so the grid above never ends on a half row. */}
                {model.uptime && (
                  <div
                    className={`flex animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards motion-reduce:animate-none [&>*]:w-full ${
                      uptimeWide ? "lg:col-span-2" : ""
                    }`}
                    style={{ animationDelay: `${charts.length * 70}ms` }}
                  >
                    <MetricCard
                      title={UPTIME_CHART.title}
                      unit=""
                      decimals={0}
                      yMode="auto0"
                      series={model.uptime.series}
                      axis={model.axis}
                      detail={model.uptime.detail}
                      format={model.uptime.format}
                      yTickFormat={model.uptime.yTickFormat}
                      restartX={model.uptime.restartX}
                    />
                  </div>
                )}
                {model.detectionTimeline && (
                  <div
                    className="flex animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards motion-reduce:animate-none lg:col-span-2 [&>*]:w-full"
                    style={{ animationDelay: `${(charts.length + 1) * 70}ms` }}
                  >
                    <DetectionTimeline data={model.detectionTimeline} state={pipeline} />
                  </div>
                )}
                {!model.detectionTimeline && model.detectionSince && (
                  <p className="text-sm text-muted-foreground lg:col-span-2">
                    {isPipeline(model.detectionSince.state)
                      ? { running: "Detecting since", idle_no_camera: "No camera connected since", stopped: "Not detecting since" }[model.detectionSince.state]
                      : "Status recorded since"}{" "}
                    {formatGapTime(model.detectionSince.since)}
                  </p>
                )}
              </div>
            )}

            {tiles.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {tiles.map((t) => (
                  <div key={t.key} className={CARD}>
                    <span className="block text-xs text-muted-foreground">{t.title}</span>
                    {t.current ? (
                      <span className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-xl font-semibold text-foreground">
                          {t.current.v.toFixed(t.decimals)}
                          <span className="text-xs font-normal text-muted-foreground">{t.unit}</span>
                        </span>
                        <StatusDot status={statusOf(t.current.v, t.thresholds)} className="self-center" />
                        {t.ago && <span className="text-[11px] text-muted-foreground">{t.ago}</span>}
                      </span>
                    ) : (
                      <span className="mt-1 block font-mono text-xl font-semibold text-muted-foreground">—</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {charts.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                Dashed lines mark the warning and critical limits.
              </span>
            )}

          </>
        )}
      </section>

      {model && events.length > 0 && (
        <section className="flex flex-col gap-3">
          <SubTitle>Recent events</SubTitle>
          <EventsCard events={events} />
        </section>
      )}
    </div>
  );
}
