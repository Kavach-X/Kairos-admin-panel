"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EventInsights } from "@/lib/types";
import { CardShell, Legend, OUTCOMES, formatCompact, formatDay, formatNumber, type OutcomeKey } from "./viz";

type Day = EventInsights["daily"][number];

/** Column segment with 4px rounded top corners when it is the topmost non-empty segment of its day. */
function segmentShape(key: OutcomeKey) {
  return function Segment(props: unknown) {
    const { x, y, width, height, fill, payload } = props as {
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      payload: Day;
    };
    if (!height || height <= 0) return <g />;
    const top = [...OUTCOMES].reverse().find((o) => payload[o.key] > 0)?.key;
    const r = top === key ? Math.min(4, width / 2, height) : 0;
    const d = `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
    // The card-colored stroke is the 2px surface gap between stacked segments.
    return <path d={d} fill={fill} stroke="var(--card)" strokeWidth={1} />;
  };
}

const SHAPES = Object.fromEntries(OUTCOMES.map((o) => [o.key, segmentShape(o.key)])) as Record<
  OutcomeKey,
  ReturnType<typeof segmentShape>
>;

export function DailyOutcomesChart({
  daily,
  title = "Events per day",
  subtitle = "Every detection, by how it ended",
  info = "How many events happened each day, split by how they ended. Hover over a bar to see the exact numbers, or switch to Table to read them as a list.",
  heightClass = "h-64",
}: {
  daily: Day[];
  title?: string;
  subtitle?: string;
  info?: string;
  heightClass?: string;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");

  const toggle = (
    <div className="flex rounded-md border border-border/60 p-0.5 text-[11px]" role="tablist" aria-label="Display as">
      {(["chart", "table"] as const).map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={view === v}
          onClick={() => setView(v)}
          className={`rounded px-2 py-0.5 capitalize transition-colors ${
            view === v ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <CardShell title={title} subtitle={subtitle} info={info} action={toggle}>
      <div className="mb-3">
        <Legend items={OUTCOMES} />
      </div>

      {view === "chart" ? (
        <div className={heightClass}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => formatDay(d)}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={24}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={(v: number) => formatCompact(v)}
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", style: { fontVariantNumeric: "tabular-nums" } }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as Day | undefined;
                  if (!active || !row) return null;
                  return (
                    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-sm">
                      <div className="text-muted-foreground mb-0.5">
                        {formatDay(row.date, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                        <strong className="font-mono text-foreground">{formatNumber(row.total)}</strong> events
                      </div>
                      {[...OUTCOMES].reverse().map((o) => (
                        <div key={o.key} className="flex items-center gap-1.5">
                          <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: o.color }} />
                          <strong className="font-mono w-8">{formatNumber(row[o.key])}</strong>
                          <span className="text-muted-foreground">{o.label}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {OUTCOMES.map((o) => (
                <Bar
                  key={o.key}
                  dataKey={o.key}
                  name={o.label}
                  stackId="outcome"
                  fill={o.color}
                  maxBarSize={24}
                  shape={SHAPES[o.key]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-64 overflow-auto overscroll-contain">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card text-[11px] text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="py-1.5 pr-3 text-left font-medium">Day</th>
                <th className="py-1.5 px-2 text-right font-medium">Total</th>
                {OUTCOMES.map((o) => (
                  <th key={o.key} className="py-1.5 px-2 text-right font-medium">
                    {o.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {[...daily].reverse().map((d) => (
                <tr key={d.date} className="border-b border-border/30 last:border-0">
                  <td className="py-1.5 pr-3 font-sans">{formatDay(d.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="py-1.5 px-2 text-right font-semibold">{formatNumber(d.total)}</td>
                  {OUTCOMES.map((o) => (
                    <td key={o.key} className="py-1.5 px-2 text-right text-muted-foreground">
                      {formatNumber(d[o.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
}
