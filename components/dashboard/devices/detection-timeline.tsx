"use client";

import * as React from "react";
import type { DevicePipelineStatus } from "@/lib/types";
import { PIPELINE_STATE } from "./detection-card";
import { StatusDot } from "./status-dot";
import { CARD } from "./section";
import { formatHour, HATCH_STYLE, type StripCell } from "./telemetry-utils";

export interface DetectionTimelineData {
  cells: StripCell[];
  /** Hours that had a camera configured (running or stopped); idle and unrecorded hours are excluded. */
  counted: number;
  running: number;
  /** Up to 5 state changes, newest first. */
  changes: { t: number; text: string }[];
  maxCameras: number;
}

type HourCell = Extract<StripCell, { kind: "hour" }>;

const CELL_COLOR: Record<DevicePipelineStatus, string> = {
  running: "bg-emerald-500/80",
  idle_no_camera: "bg-zinc-400/60",
  stopped: "bg-rose-500/80",
};

const isPipeline = (s: string | null): s is DevicePipelineStatus =>
  s === "running" || s === "idle_no_camera" || s === "stopped";

const cams = (n: number) => `${n} camera${n === 1 ? "" : "s"} configured`;

function stateWords(c: HourCell) {
  if (!c.has) return "Offline, no data";
  return isPipeline(c.status) ? PIPELINE_STATE[c.status].title : "Status not recorded";
}

/**
 * One cell per hour: green detecting, grey no camera, red not detecting, pale hatched = hour reported but
 * no status recorded, blank = offline (long offline stretches collapse into one labelled marker, as on the
 * charts). A thin row underneath shows how many cameras were configured each hour.
 */
export function DetectionTimeline({
  data,
  state,
}: {
  data: DetectionTimelineData;
  /** Current state (live result, else the latest hourly row). */
  state: DevicePipelineStatus | null;
}) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const [hover, setHover] = React.useState<{ i: number; x: number } | null>(null);
  const { cells, counted, running, changes, maxCameras } = data;
  const gapClass = cells.length <= 48 ? "gap-px" : "gap-0";
  const pct = counted > 0 ? Math.round((running / counted) * 100) : null;
  const words = state ? PIPELINE_STATE[state].title : "Not reported yet";

  const enter = (i: number, el: HTMLElement) => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const r = el.getBoundingClientRect();
    const half = 95;
    setHover({ i, x: Math.min(Math.max(r.left + r.width / 2 - box.left, half), Math.max(half, box.width - half)) });
  };

  const tip = hover ? cells[hover.i] : null;
  return (
    <div className={`${CARD} flex flex-col gap-3`}>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Detection timeline</span>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="flex items-center gap-2 text-xl font-semibold leading-none text-foreground">
            {words}
            {state === "stopped" && <StatusDot status="crit" />}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {pct !== null
              ? `Detecting for ${running} of ${counted} hours with a camera (${pct}%)`
              : "No camera was configured in this range"}
          </span>
        </div>
      </div>

      <div ref={wrap} className="relative flex flex-col gap-1" onPointerLeave={() => setHover(null)}>
        <div className={`flex h-7 ${gapClass}`} role="img" aria-label="Detection state by hour">
          {cells.map((c, i) => {
            if (c.kind === "gap")
              return (
                <div
                  key={`gap-${i}`}
                  className="flex flex-none cursor-pointer items-center whitespace-nowrap px-2 text-[10px] text-muted-foreground"
                  onPointerEnter={(e) => enter(i, e.currentTarget)}
                >
                  {c.label}
                </div>
              );
            const known = c.has && isPipeline(c.status);
            return (
              <div
                key={c.t}
                className={`min-w-0 flex-1 cursor-pointer transition-[filter] ${hover?.i === i ? "brightness-125" : ""} ${
                  known ? CELL_COLOR[c.status as DevicePipelineStatus] : c.has ? "bg-muted/40" : ""
                }`}
                style={c.has && !known ? HATCH_STYLE : undefined}
                onPointerEnter={(e) => enter(i, e.currentTarget)}
              />
            );
          })}
        </div>

        {maxCameras > 0 && (
          <div className={`flex h-3 items-end ${gapClass}`} aria-hidden>
            {cells.map((c, i) =>
              c.kind === "gap" ? (
                <div key={`cg-${i}`} className="invisible flex-none whitespace-nowrap px-2 text-[10px]">
                  {c.label}
                </div>
              ) : (
                <div key={c.t} className="flex h-full min-w-0 flex-1 items-end">
                  {c.has && c.cameras !== null && (
                    <div
                      className="w-full bg-muted-foreground/35"
                      style={{ height: c.cameras === 0 ? "2px" : `${Math.max(25, (c.cameras / maxCameras) * 100)}%` }}
                    />
                  )}
                </div>
              )
            )}
          </div>
        )}

        {tip && hover && (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
            style={{ left: hover.x }}
          >
            {tip.kind === "gap" ? (
              <>
                <div className="font-medium text-foreground">{tip.label}</div>
                <div className="text-muted-foreground">No data from the device</div>
              </>
            ) : (
              <>
                <div className="font-medium text-foreground">{formatHour(tip.t)}</div>
                <div className="text-muted-foreground">{stateWords(tip)}</div>
                {tip.has && tip.cameras !== null && <div className="text-muted-foreground">{cams(tip.cameras)}</div>}
              </>
            )}
          </div>
        )}
      </div>

      {changes.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border/50 pt-3 text-xs">
          {changes.map((c, i) => (
            <li key={`${c.t}-${i}`} className="flex gap-3">
              <span className="w-28 shrink-0 font-mono text-muted-foreground">{formatHourShort(c.t)}</span>
              <span className="text-foreground">{c.text}</span>
            </li>
          ))}
        </ul>
      )}
      <span className="text-[11px] text-muted-foreground">
        One status per hour{maxCameras > 0 ? ", lower line = cameras configured" : ""}
      </span>
    </div>
  );
}

function formatHourShort(t: number) {
  return new Date(t)
    .toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .replace(",", "");
}
