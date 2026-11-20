"use client";

import Link from "next/link";
import type { EventInsights } from "@/lib/types";
import { CardShell, Legend, OUTCOMES, formatNumber, formatPct, useHoverTip } from "./viz";

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/** Stacked horizontal bar per detection label, scaled to the busiest label so rows compare. */
export function LabelBreakdown({ labels }: { labels: EventInsights["labels"] }) {
  const { containerRef, bind, node } = useHoverTip();
  const max = Math.max(1, ...labels.map((l) => l.total));

  return (
    <CardShell
      title="By detection type"
      subtitle="What the edge model flagged, and how it ended"
      info="What the camera thought it saw, and how those events ended. A long orange part means that type causes a lot of false alarms."
    >
      <div className="mb-3">
        <Legend items={OUTCOMES} />
      </div>
      {labels.length === 0 ? (
        <p className="text-xs text-muted-foreground">No detections in this range.</p>
      ) : (
        <div ref={containerRef} className="relative space-y-2.5">
          {labels.map((l) => (
            <div key={l.label} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2.5">
              <span className="truncate text-xs text-foreground" title={l.label}>
                {titleCase(l.label)}
              </span>
              <div className="flex h-3.5 gap-[2px]" style={{ width: `${(l.total / max) * 100}%` }}>
                {OUTCOMES.filter((o) => l[o.key] > 0).map((o, i, shown) => (
                  <div
                    key={o.key}
                    className={`h-full outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring ${
                      i === shown.length - 1 ? "rounded-r" : ""
                    }`}
                    style={{ flexGrow: l[o.key], flexBasis: 0, background: o.color, minWidth: 2 }}
                    {...bind({
                      title: titleCase(l.label),
                      rows: [
                        { label: o.label, value: formatNumber(l[o.key]), color: o.color },
                        { label: "of all", value: formatPct(l[o.key], l.total) },
                      ],
                    })}
                  />
                ))}
              </div>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatNumber(l.total)}</span>
            </div>
          ))}
          {node}
        </div>
      )}
    </CardShell>
  );
}

export function FalseAlarmReasons({
  reasons,
  falseAlarms,
}: {
  reasons: EventInsights["falseAlarmReasons"];
  falseAlarms: number;
}) {
  const max = Math.max(1, ...reasons.map((r) => r.count));
  return (
    <CardShell
      title="Why alarms were false"
      subtitle={`Top reasons across ${formatNumber(falseAlarms)} false alarms`}
      info="The reasons given (by the AI or by our team) for calling an event a false alarm. Fixing the top reason removes the most noise."
    >
      {reasons.length === 0 ? (
        <p className="text-xs text-muted-foreground">No false-alarm reasons recorded in this range.</p>
      ) : (
        <div className="space-y-2.5">
          {reasons.map((r) => (
            <div key={r.reason}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-foreground/90 line-clamp-1" title={r.reason}>
                  {r.reason}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground shrink-0">{formatNumber(r.count)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-r" style={{ width: `${(r.count / max) * 100}%`, background: "var(--viz-false-alarm)" }} />
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

/** The devices generating the most events; a high false-alarm rate points at a camera to re-aim or retrain. */
export function NoisyDevices({ devices }: { devices: EventInsights["devices"] }) {
  return (
    <CardShell
      title="Busiest devices"
      subtitle="Top 10 by event volume. A high false-alarm rate usually means a camera to re-aim or retrain"
      info="The 10 devices that sent the most events. False-alarm rate is the share of a device's events that were false alarms. A high rate usually means a camera needs re-aiming, cleaning or a settings change."
    >
      {devices.length === 0 ? (
        <p className="text-xs text-muted-foreground">No device activity in this range.</p>
      ) : (
        <div className="-mx-4 -mb-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="text-[11px] text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="px-4 py-2 text-left font-medium">Device</th>
                <th className="px-2 py-2 text-left font-medium">Customer</th>
                <th className="px-2 py-2 text-right font-medium">Events</th>
                <th className="px-2 py-2 text-right font-medium">Confirmed</th>
                <th className="px-2 py-2 text-right font-medium">False alarms</th>
                <th className="px-4 py-2 text-left font-medium w-40">False-alarm rate</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const rate = d.total > 0 ? d.falseAlarm / d.total : 0;
                return (
                  <tr key={d.deviceId} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/devices/${encodeURIComponent(d.deviceId)}`}
                        className="font-mono font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {d.deviceId}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{d.accountName ?? "Unassigned"}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold">{formatNumber(d.total)}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">{formatNumber(d.confirmed)}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">{formatNumber(d.falseAlarm)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 flex-1 rounded-full"
                          style={{ background: "color-mix(in oklab, var(--viz-false-alarm) 18%, var(--card))" }}
                          role="meter"
                          aria-valuenow={Math.round(rate * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`False-alarm rate for ${d.deviceId}`}
                        >
                          <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: "var(--viz-false-alarm)" }} />
                        </div>
                        <span className="w-9 text-right font-mono tabular-nums text-muted-foreground">{formatPct(d.falseAlarm, d.total)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (h: number) => String(h).padStart(2, "0");

/** Day-of-week × hour grid in one hue: darker = more events. */
export function HourHeatmap({ heatmap, tz }: { heatmap: EventInsights["heatmap"]; tz: string }) {
  const { containerRef, bind, node } = useHoverTip();
  const counts = new Map(heatmap.map((c) => [`${c.dow}-${c.hour}`, c.count]));
  const max = Math.max(0, ...heatmap.map((c) => c.count));
  const busiest = heatmap.reduce<(typeof heatmap)[number] | null>((a, c) => (!a || c.count > a.count ? c : a), null);

  const fill = (n: number) =>
    n === 0
      ? "color-mix(in oklab, var(--muted) 55%, var(--card))"
      : `color-mix(in oklab, var(--viz-seq) ${Math.round(15 + 85 * (n / max))}%, var(--card))`;

  return (
    <CardShell
      title="When events happen"
      info="Which days and hours get the most events, in Indian time. Darker squares mean more events. Useful for spotting busy hours, or a camera that misbehaves at the same time every day."
      subtitle={
        busiest
          ? `Busiest hour: ${DAYS[busiest.dow - 1]} ${pad(busiest.hour)}:00 (${formatNumber(busiest.count)} events) · ${tz}`
          : `Local time · ${tz}`
      }
    >
      <div ref={containerRef} className="relative overflow-x-auto">
        <div className="grid min-w-[520px] grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-[2px]">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center font-mono text-[9px] text-muted-foreground">
              {h % 6 === 0 ? pad(h) : ""}
            </span>
          ))}
          {DAYS.map((day, di) => (
            <div key={day} className="contents">
              <span className="pr-1 text-[10px] leading-5 text-muted-foreground">{day}</span>
              {Array.from({ length: 24 }, (_, h) => {
                const n = counts.get(`${di + 1}-${h}`) ?? 0;
                return (
                  <div
                    key={h}
                    className="h-5 rounded-[3px] outline-none hover:ring-1 hover:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ background: fill(n) }}
                    aria-label={`${day} ${pad(h)}:00, ${n} events`}
                    {...bind({
                      title: `${day} ${pad(h)}:00–${pad((h + 1) % 24)}:00`,
                      rows: [{ label: n === 1 ? "event" : "events", value: formatNumber(n) }],
                    })}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          Fewer
          <span
            className="h-2 w-24 rounded-full"
            style={{ background: "linear-gradient(to right, color-mix(in oklab, var(--viz-seq) 15%, var(--card)), var(--viz-seq))" }}
          />
          More
        </div>
        {node}
      </div>
    </CardShell>
  );
}
