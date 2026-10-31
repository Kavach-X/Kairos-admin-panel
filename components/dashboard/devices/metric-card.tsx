"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatGapTime,
  statusOf,
  THRESHOLD_STROKE,
  type Stats,
  type Thresholds,
  type TimeAxis,
} from "./telemetry-utils";
import { StatusDot } from "./status-dot";

/** A reading: real time `t`, position `x` on the compressed axis, value `v`. */
export interface Pt {
  t: number;
  x: number;
  v: number;
  /** Where the reading came from (kept for CSV export). */
  src: "hourly" | "live";
}

/** One metric's time-sorted series (hourly points and live readings merged) plus header info. */
export interface SeriesData {
  id: string;
  label: string;
  color: string;
  points: Pt[];
  current: Pt | null;
  /** "3h ago" for the current reading. */
  currentAgo: React.ReactNode;
  stats: Stats | null;
}

const fmt = (v: number, decimals: number) => v.toFixed(decimals);
// Small dots only while the series is short enough for them to stay readable.
const DOT_LIMIT = 30;

type Row = { x: number; t: number; vals: Record<string, number> } & Record<string, unknown>;

/**
 * Chart card. Each series keeps ONE hue for its line and soft area; status is shown only by the dot
 * next to the current value and by faint dashed warning / critical lines. The X axis is the shared
 * compressed axis (data points only, each offline gap a narrow labelled marker) but starts at this
 * card's own first point. The Y range is fitted to the data and a threshold line is drawn only when it
 * falls inside that range. Range stats are one quiet text line, never boxes.
 */
export function MetricCard({
  title,
  unit,
  decimals,
  yMode,
  thresholds,
  series,
  axis,
  detail,
  format,
  yTickFormat,
  restartX,
}: {
  title: string;
  unit: string;
  decimals: number;
  yMode: "padded" | "zero" | "full" | "auto0";
  /** Status limits. Omit for a metric that has none (no status dot, no limit lines). */
  thresholds?: Thresholds;
  series: SeriesData[];
  axis: TimeAxis;
  /** One extra quiet line under the values (free space, SSID, load...). */
  detail?: React.ReactNode;
  /** Writes a value for the header and tooltip instead of `value + unit`. */
  format?: (v: number) => string;
  yTickFormat?: (v: number) => string;
  /** X positions that follow a restart: drawn as a small neutral marker and named in the tooltip. */
  restartX?: Set<number>;
}) {
  const uid = React.useId().replace(/:/g, "");
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const multi = series.length > 1;

  // Each run of consecutive points with no offline gap between is its own <Area>, so lines never
  // cross a collapsed gap. Rows are merged by x for the shared tooltip.
  const { rows, segments } = React.useMemo(() => {
    const byX = new Map<number, Row>();
    const segs: { key: string; seriesId: string; color: string; count: number }[] = [];
    for (const s of series) {
      let seg = -1;
      let prev: Pt | null = null;
      for (const p of s.points) {
        if (prev === null || axis.isBreak(prev.t, p.t)) {
          seg += 1;
          segs.push({ key: `${s.id}__${seg}`, seriesId: s.id, color: s.color, count: s.points.length });
        }
        prev = p;
        const row = byX.get(p.x) ?? ({ x: p.x, t: p.t, vals: {} } as Row);
        row.vals[s.id] = p.v;
        row[`${s.id}__${seg}`] = p.v;
        byX.set(p.x, row);
      }
    }
    return { rows: [...byX.values()].sort((a, b) => a.x - b.x), segments: segs };
  }, [series, axis]);

  // This card's own first non-null point, and X ticks snapped to this card's points.
  const { firstX, firstT, xTicks, yDomain } = React.useMemo(() => {
    const pts = series.flatMap((s) => s.points).sort((a, b) => a.x - b.x);
    const fx = pts.length > 0 ? pts[0].x : 0;
    const ft = pts.length > 0 ? pts[0].t : axis.startT;

    const ticks: { x: number; label: string }[] = [];
    for (let k = 0; k <= 2; k++) {
      const target = fx + (k / 2) * (axis.xMax - fx);
      let best = pts[0];
      for (const p of pts) if (best && Math.abs(p.x - target) < Math.abs(best.x - target)) best = p;
      if (best && !ticks.some((tk) => tk.x === best.x)) ticks.push({ x: best.x, label: axis.label(best.t) });
    }

    const values = pts.map((p) => p.v);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const y: [number, number | "auto"] =
      yMode === "padded"
        ? [Math.floor(lo - 5), Math.ceil(hi + 5)]
        : yMode === "full"
          ? [0, 100]
          : yMode === "auto0"
            ? [0, "auto"]
            : [0, Math.ceil(Math.max(25, hi * 1.3))];
    return { firstX: fx, firstT: ft, xTicks: ticks, yDomain: y };
  }, [series, axis, yMode]);

  const tickLabel = React.useMemo(() => new Map(xTicks.map((t) => [t.x, t.label])), [xTicks]);
  const collectingSince = firstT > axis.startT;
  const inRange = (y: number) => typeof yDomain[1] === "number" && y >= yDomain[0] && y <= yDomain[1];
  const show = (v: number) => (format ? format(v) : `${fmt(v, decimals)}${unit}`);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {series.map((s) => (
          <div key={s.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {multi && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            )}
            {s.current ? (
              <>
                <span className="font-mono text-xl font-semibold leading-none text-foreground">
                  {format ? (
                    format(s.current.v)
                  ) : (
                    <>
                      {fmt(s.current.v, decimals)}
                      <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                    </>
                  )}
                </span>
                {thresholds && <StatusDot status={statusOf(s.current.v, thresholds)} className="self-center" />}
                {s.currentAgo && <span className="text-[11px]">{s.currentAgo}</span>}
              </>
            ) : (
              <span className="font-mono text-xl font-semibold leading-none text-muted-foreground">—</span>
            )}
            {s.stats && (
              <span className="ml-auto text-[11px] text-muted-foreground">
                Range {fmt(s.stats.min, decimals)}–{fmt(s.stats.max, decimals)}, avg {fmt(s.stats.avg, decimals)}
              </span>
            )}
          </div>
        ))}
        {detail && <span className="text-[11px] text-muted-foreground">{detail}</span>}
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.id} id={`${uid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[firstX, axis.xMax]}
              ticks={xTicks.map((t) => t.x)}
              tickFormatter={(x) => tickLabel.get(x as number) ?? ""}
              allowDataOverflow
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={yDomain}
              tickCount={4}
              tickFormatter={yTickFormat}
              allowDecimals={yMode === "auto0"}
              allowDataOverflow
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            {axis.gapAreas
              .filter((g) => g.x1 >= firstX)
              .map((g) => (
                <ReferenceArea
                  key={g.x1}
                  x1={g.x1}
                  x2={g.x2}
                  fill="var(--color-muted)"
                  fillOpacity={0.5}
                  stroke="none"
                  label={{ value: g.label, angle: -90, position: "center", fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
              ))}
            {thresholds && inRange(thresholds.warn) && (
              <ReferenceLine y={thresholds.warn} stroke={THRESHOLD_STROKE.warn} strokeDasharray="3 4" strokeOpacity={0.4} />
            )}
            {thresholds && inRange(thresholds.crit) && (
              <ReferenceLine y={thresholds.crit} stroke={THRESHOLD_STROKE.crit} strokeDasharray="3 4" strokeOpacity={0.4} />
            )}
            <Tooltip
              cursor={{ stroke: "var(--color-muted-foreground)", strokeOpacity: 0.5 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Row | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-sm">
                    <div className="text-muted-foreground">{formatGapTime(row.t)}</div>
                    {series
                      .filter((s) => row.vals[s.id] !== undefined)
                      .map((s) => (
                        <div key={s.id} className="flex items-center gap-1.5">
                          <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                          {multi && <span className="text-muted-foreground">{s.label}</span>}
                          <strong className="font-mono">{show(row.vals[s.id])}</strong>
                          {thresholds && <StatusDot status={statusOf(row.vals[s.id], thresholds)} />}
                        </div>
                      ))}
                    {restartX?.has(row.x) && <div className="text-muted-foreground">Restarted</div>}
                  </div>
                );
              }}
            />
            {segments.map((seg) => (
              <Area
                key={seg.key}
                type="linear"
                dataKey={seg.key}
                stroke={seg.color}
                strokeWidth={1.75}
                fill={`url(#${uid}-${seg.seriesId})`}
                dot={(p: { cx?: number; cy?: number; payload?: Row }) => {
                  const key = `${seg.key}-${p.cx}-${p.cy}`;
                  if (p.cx === undefined || p.cy === undefined) return <g key={key} />;
                  if (p.payload && restartX?.has(p.payload.x))
                    return (
                      <circle
                        key={key}
                        cx={p.cx}
                        cy={p.cy}
                        r={4}
                        fill="var(--color-card)"
                        stroke="var(--color-muted-foreground)"
                        strokeWidth={1.5}
                      />
                    );
                  return seg.count < DOT_LIMIT ? <circle key={key} cx={p.cx} cy={p.cy} r={2} fill={seg.color} /> : <g key={key} />;
                }}
                activeDot={{ r: 3.5, fill: seg.color, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={!reduceMotion}
                animationDuration={900}
                animationEasing="ease-out"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {collectingSince && (
        <span className="text-[11px] text-muted-foreground">Collecting since {formatGapTime(firstT)}</span>
      )}
    </div>
  );
}
