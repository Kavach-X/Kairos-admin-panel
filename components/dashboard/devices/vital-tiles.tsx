import * as React from "react";
import { StatusDot } from "./status-dot";
import type { Status } from "./telemetry-utils";

export interface Vital {
  id: string;
  label: string;
  /** Number shown big, already formatted. */
  display: string;
  unit: string;
  /** The metric's own hue (same as its chart). */
  color: string;
  status: Status;
  caption?: string;
  /** How the value is drawn: a trend line, a usage bar, or signal bars. */
  visual:
    | { kind: "spark"; values: number[] }
    | { kind: "bar"; pct: number; marks: number[] }
    | { kind: "signal"; bars: number };
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const uid = React.useId().replace(/:/g, "");
  if (values.length < 2) return <div className="h-6 rounded bg-muted/40" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - ((v - lo) / span) * 26 - (hi === lo ? -11 : 0)]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-6 w-full" aria-hidden>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${line} 100,32`} fill={`url(#${uid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function UsageBar({ pct, marks, color }: { pct: number; marks: number[]; color: string }) {
  return (
    <div className="relative flex h-6 items-center">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/70">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
        {marks.map((m) => (
          <span key={m} className="absolute inset-y-0 w-px bg-foreground/30" style={{ left: `${m}%` }} />
        ))}
      </div>
    </div>
  );
}

function SignalBars({ bars, color }: { bars: number; color: string }) {
  return (
    <div className="flex h-6 items-end gap-1" aria-hidden>
      {[0.3, 0.5, 0.75, 1].map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm"
          style={{ height: `${h * 100}%`, background: i < bars ? color : "var(--color-muted)" }}
        />
      ))}
    </div>
  );
}

function Tile({ v }: { v: Vital }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="truncate text-xs font-medium text-muted-foreground">{v.label}</span>
        <StatusDot status={v.status} />
      </div>
      <span className="font-mono text-xl font-semibold leading-none text-foreground">
        {v.display}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">{v.unit}</span>
      </span>
      {v.visual.kind === "spark" && <Spark values={v.visual.values} color={v.color} />}
      {v.visual.kind === "bar" && <UsageBar pct={v.visual.pct} marks={v.visual.marks} color={v.color} />}
      {v.visual.kind === "signal" && <SignalBars bars={v.visual.bars} color={v.color} />}
      <span className="min-h-4 truncate text-[11px] text-muted-foreground" title={v.caption}>
        {v.caption}
      </span>
    </div>
  );
}

/** Current vitals, each drawn in the form that suits it. Missing metrics are simply absent. */
export function VitalTiles({
  vitals,
  busy,
}: {
  vitals: Vital[];
  /** A live check is in flight: the current values are dimmed and pulse. */
  busy: boolean;
}) {
  if (vitals.length === 0) return null;
  return (
    <div className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 xl:grid-cols-6 ${busy ? "animate-pulse opacity-60" : ""}`}>
      {vitals.map((v) => (
        <Tile key={v.id} v={v} />
      ))}
    </div>
  );
}

/** Same footprint as the real tiles, shown while the first data loads so nothing shifts when it arrives. */
export function VitalTilesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[112px] animate-pulse rounded-xl border border-border bg-muted/30" />
      ))}
    </div>
  );
}
