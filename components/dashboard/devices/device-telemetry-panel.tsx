"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Activity, Radio, RefreshCw, Thermometer, Cpu, MemoryStick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDeviceLiveVitalsAction,
  getDeviceTelemetryHistoryAction,
} from "@/lib/actions/device.actions";
import type {
  DeviceLiveVitals,
  DeviceTelemetryPoint,
  TelemetryRange,
} from "@/lib/types";

// recharts is heavy and only needed once history has loaded, so keep it out of the page bundle.
const TelemetryChart = dynamic(() => import("./telemetry-chart").then((m) => m.TelemetryChart), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded bg-muted/40" />,
});

const RANGES: TelemetryRange[] = ["24h", "7d", "30d"];
const EXPECTED_HOURS: Record<TelemetryRange, number> = { "24h": 24, "7d": 168, "30d": 720 };

const SERIES = [
  { key: "avg_temp", label: "Temperature", unit: "°C", color: "hsl(38, 92%, 50%)", icon: Thermometer },
  { key: "avg_cpu", label: "CPU", unit: "%", color: "hsl(217, 91%, 60%)", icon: Cpu },
  { key: "avg_memory", label: "Memory", unit: "%", color: "hsl(160, 84%, 39%)", icon: MemoryStick },
] as const;

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Mount with `key={deviceId}` so live/history state resets per device. */
export function DeviceTelemetryPanel({ deviceId }: { deviceId: string }) {
  const [range, setRange] = React.useState<TelemetryRange>("24h");
  const [historyResult, setHistoryResult] = React.useState<{
    range: TelemetryRange;
    points: DeviceTelemetryPoint[];
    error: string | null;
  } | null>(null);
  const historyLoading = historyResult?.range !== range;
  const history = historyResult?.points ?? [];
  const historyError = historyResult?.error ?? null;

  const [live, setLive] = React.useState<DeviceLiveVitals | null>(null);
  const [liveLoading, setLiveLoading] = React.useState(false);
  const [liveError, setLiveError] = React.useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getDeviceTelemetryHistoryAction(deviceId, range).then((res) => {
      if (cancelled) return;
      setHistoryResult(
        res.success && res.data
          ? { range, points: res.data.metrics, error: null }
          : { range, points: [], error: res.error || "Failed to load history" }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId, range]);

  const checkLive = async () => {
    setLiveLoading(true);
    setLiveError(null);
    const res = await getDeviceLiveVitalsAction(deviceId);
    if (res.success && res.data) {
      setLive(res.data);
      setFetchedAt(new Date());
    } else {
      setLiveError(res.error || "Failed to fetch live data");
    }
    setLiveLoading(false);
  };

  // Hours with no rollup (device offline/silent) count as 0%, so divide by the
  // hours the range should contain rather than by the rows received.
  const expectedHours = EXPECTED_HOURS[range];
  const avgUptime =
    history.length > 0
      ? history.reduce((sum, p) => sum + p.uptime_percent, 0) /
        Math.max(expectedHours, history.length)
      : null;

  const metrics = live?.vitals?.metrics;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Health Telemetry
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-[11px]"
          onClick={checkLive}
          disabled={liveLoading}
        >
          {liveLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Radio className="h-3 w-3" />
          )}
          {live ? "Refresh Live Data" : "Check Live Data"}
        </Button>
      </div>

      {/* Live vitals (on demand) */}
      {liveError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400">
          {liveError}
        </div>
      )}
      {live && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className={
                live.operational_status === "ONLINE"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                  : live.operational_status === "DEGRADED"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]"
                    : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-[10px]"
              }
            >
              {live.operational_status}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {live.source === "AWS_SHADOW" ? "AWS IoT Shadow" : "Database fallback"} ·{" "}
              {live.data_freshness}
              {fetchedAt && ` · ${fetchedAt.toLocaleTimeString()}`}
            </span>
          </div>

          {live.vitals ? (
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <Stat label="Temp" value={metrics?.temperature_celsius} unit="°C" />
              <Stat label="CPU" value={metrics?.cpu_percent} unit="%" />
              <Stat label="Memory" value={metrics?.memory_percent} unit="%" />
              <Stat label="Disk" value={metrics?.disk_percent} unit="%" />
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Uptime</span>
                <span className="text-foreground">{formatUptime(live.vitals.uptime_seconds)}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Firmware</span>
                <span className="text-foreground">{live.vitals.firmware_version}</span>
              </div>
              <div className="col-span-3 font-sans">
                <span className="text-[10px] text-muted-foreground">AI Pipeline: </span>
                <span
                  className={
                    live.vitals.ai_pipeline_healthy
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-rose-600 dark:text-rose-400 font-medium"
                  }
                >
                  {live.vitals.ai_pipeline_healthy ? "Healthy" : "Unhealthy"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Device is offline
              {live.disconnect_reason ? ` (${live.disconnect_reason})` : ""}. Last seen:{" "}
              {live.last_seen_at ? new Date(live.last_seen_at).toLocaleString() : "never"}.
            </p>
          )}

          {live.cameras.length > 0 && (
            <div className="flex flex-col gap-1 pt-2 border-t border-border/40">
              {live.cameras.map((cam) => (
                <div key={cam.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-foreground">
                    CH {cam.channel} · {cam.name}
                  </span>
                  <span
                    className={`font-mono ${cam.mismatch ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                    title={cam.mismatch_reason}
                  >
                    {cam.status} · {cam.fps}/{cam.ai_fps} fps
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History (hourly rollups) */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            History
            {avgUptime !== null && (
              <> · avg uptime <strong className="text-foreground">{avgUptime.toFixed(1)}%</strong></>
            )}
          </span>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button
                key={r}
                variant={r === range ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setRange(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <p className="text-muted-foreground text-center py-6">Loading history…</p>
        ) : historyError ? (
          <p className="text-rose-600 dark:text-rose-400 text-center py-6">{historyError}</p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            No telemetry rollups recorded in this range.
          </p>
        ) : (
          SERIES.map(({ key, label, unit, color, icon: Icon }) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {label} (avg {unit})
              </span>
              <div className="h-24">
                <TelemetryChart
                  data={history}
                  dataKey={key}
                  label={label}
                  unit={unit}
                  color={color}
                  range={range}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground block font-sans">{label}</span>
      <span className="text-foreground">
        {value === undefined || value === null ? "—" : `${value.toFixed(1)}${unit}`}
      </span>
    </div>
  );
}
