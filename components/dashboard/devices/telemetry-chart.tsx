"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DeviceTelemetryPoint, TelemetryRange } from "@/lib/types";

function formatTick(ts: string, range: TelemetryRange) {
  const date = new Date(ts);
  return range === "24h"
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function TelemetryChart({
  data,
  dataKey,
  label,
  unit,
  color,
  range,
}: {
  data: DeviceTelemetryPoint[];
  dataKey: string;
  label: string;
  unit: string;
  color: string;
  range: TelemetryRange;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(ts) => formatTick(ts, range)}
          tick={{ fontSize: 9 }}
          minTickGap={32}
          tickLine={false}
          axisLine={false}
        />
        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
        <Tooltip
          labelFormatter={(ts) => new Date(ts as string).toLocaleString()}
          formatter={(v) => [`${Number(v).toFixed(1)}${unit}`, label]}
          contentStyle={{ fontSize: 11 }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
