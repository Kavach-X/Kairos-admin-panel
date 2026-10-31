"use client";

import * as React from "react";
import { formatHour, HATCH_STYLE, type StripCell } from "./telemetry-utils";


const num = (v: number | null, unit: string, digits = 1) => (v === null ? null : `${v.toFixed(digits)}${unit}`);

function Tip({ cell }: { cell: StripCell }) {
  if (cell.kind === "gap")
    return (
      <>
        <div className="font-medium text-foreground">{cell.label}</div>
        <div className="text-muted-foreground">No data from the device</div>
      </>
    );
  const v = cell.values;
  const all: [string, string | null][] = v
    ? [
        ["Temp", num(v.temp, "°C")],
        ["CPU", num(v.cpu, "%")],
        ["Memory", num(v.memory, "%")],
        ["Disk", num(v.disk, "%")],
        ["Wi-Fi", num(v.wifi, " dBm", 0)],
      ]
    : [];
  const rows = all.flatMap(([k, val]): [string, string][] => (val === null ? [] : [[k, val]]));
  return (
    <>
      <div className="font-medium text-foreground">{formatHour(cell.t)}</div>
      <div className="mb-1 text-muted-foreground">{cell.has ? "Device sent data this hour" : "No data this hour (device offline)"}</div>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
          {rows.map(([k, val]) => (
            <React.Fragment key={k}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-mono text-foreground">{val}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </>
  );
}

/**
 * One thin line: green = reporting, hatched = offline (hours with no row and collapsed offline gaps).
 * Hovering a cell shows its details instantly in a tooltip that follows the pointer along the strip.
 */
export function AvailabilityStrip({
  cells,
  coverage,
  rangeLabel,
}: {
  cells: StripCell[];
  coverage: number | null;
  rangeLabel: string;
}) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const [hover, setHover] = React.useState<{ i: number; x: number } | null>(null);
  if (cells.length === 0) return null;
  // Long ranges (7d / 30d) are split into one segment per day so the bar reads as days, not one blur.
  const byDay = cells.length > 48;
  const gapClass = byDay ? "gap-0" : "gap-px";
  const groups: { first: number; cells: StripCell[] }[] = [];
  if (byDay) {
    let dayKey = "";
    cells.forEach((c, i) => {
      if (c.kind === "hour") {
        const key = new Date(c.t).toDateString();
        if (key !== dayKey || groups.length === 0) {
          dayKey = key;
          groups.push({ first: i, cells: [] });
        }
      }
      if (groups.length === 0) groups.push({ first: i, cells: [] });
      groups[groups.length - 1].cells.push(c);
    });
  } else {
    groups.push({ first: 0, cells });
  }

  const enter = (i: number, el: HTMLElement) => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const r = el.getBoundingClientRect();
    const half = 90; // keep the tooltip inside the strip's width
    const x = Math.min(Math.max(r.left + r.width / 2 - box.left, half), Math.max(half, box.width - half));
    setHover({ i, x });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={wrap} className="relative" onPointerLeave={() => setHover(null)}>
        <div className={`flex h-3 ${byDay ? "gap-1" : ""}`} role="img" aria-label="Hours the device sent data">
          {groups.map((g) => (
            <div
              key={g.first}
              className={`flex min-w-0 overflow-hidden rounded-full ${gapClass}`}
              style={{ flexGrow: g.cells.length, flexBasis: 0 }}
            >
              {g.cells.map((c, k) => {
                const i = g.first + k;
                const on = hover?.i === i;
                return c.kind === "gap" ? (
                  <div
                    key={`gap-${i}`}
                    className={`w-2 flex-none cursor-pointer bg-muted ${on ? "opacity-60" : ""}`}
                    style={HATCH_STYLE}
                    onPointerEnter={(e) => enter(i, e.currentTarget)}
                  />
                ) : (
                  <div
                    key={c.t}
                    className={`min-w-0 flex-1 cursor-pointer transition-colors ${
                      c.has ? (on ? "bg-emerald-400" : "bg-emerald-500/70") : "bg-muted"
                    } ${!c.has && on ? "opacity-60" : ""}`}
                    style={c.has ? undefined : HATCH_STYLE}
                    onPointerEnter={(e) => enter(i, e.currentTarget)}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {hover && (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
            style={{ left: hover.x }}
          >
            <Tip cell={cells[hover.i]} />
          </div>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground">
        {coverage !== null ? `Sent data in ${coverage.toFixed(0)}% of the hours, last ${rangeLabel}` : "Data history"}
      </span>
    </div>
  );
}
