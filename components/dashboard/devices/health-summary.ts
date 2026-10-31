import type { DeviceLiveResult } from "@/lib/types";
import { statusOf, type Thresholds } from "./telemetry-utils";

export interface HealthMetric {
  name: string;
  unit: string;
  decimals: number;
  thresholds: Thresholds;
  /** Latest value (a live reading when there is one). */
  current: number | null;
  /** Worst value over the visible range: the max, or the min when lower is worse. */
  worst: number | null;
}

export interface HealthReason {
  severity: "crit" | "warn";
  text: string;
}

/**
 * Reasons the device needs attention, most severe first. Empty = healthy.
 * Uses the latest live result / presence and the thresholds over the visible range.
 */
export function computeHealth({
  online,
  live,
  pipelineStatus,
  unreachableCameras = [],
  metrics,
}: {
  online: boolean;
  live: DeviceLiveResult | null;
  /** Latest known pipeline status (live result, else the latest hourly row). */
  pipelineStatus: string | null;
  /** Cameras the device reported as unreachable in the latest live check. */
  unreachableCameras?: string[];
  metrics: HealthMetric[];
}): HealthReason[] {
  const reasons: HealthReason[] = [];

  if (live?.status === "OFFLINE" || (!live && !online)) {
    reasons.push({ severity: "crit", text: "Device is offline" });
  } else if (live?.status === "NO_RESPONSE") {
    reasons.push({ severity: "warn", text: "Device is online but did not respond" });
  }

  // idle_no_camera is intentional (nothing to detect on yet), so it is not a reason.
  if (pipelineStatus === "stopped") reasons.push({ severity: "crit", text: "Detection is stopped although a camera is set up" });
  if (unreachableCameras.length > 0)
    reasons.push({
      severity: "warn",
      text: `Camera ${unreachableCameras.join(", ")} can't be reached`,
    });

  for (const m of metrics) {
    const fmt = (v: number) => `${v.toFixed(m.decimals)}${m.unit}`;
    const cur = m.current !== null ? statusOf(m.current, m.thresholds) : "ok";
    if (cur === "crit") {
      reasons.push({ severity: "crit", text: `${m.name} ${fmt(m.current as number)} is critical` });
    } else if (cur === "warn") {
      reasons.push({ severity: "warn", text: `${m.name} ${fmt(m.current as number)} is above its warning level` });
    } else if (m.worst !== null && statusOf(m.worst, m.thresholds) === "crit") {
      reasons.push({ severity: "warn", text: `${m.name} reached a critical ${fmt(m.worst)} in this range` });
    }
  }

  // crit before warn; otherwise keep insertion order (device state first, then metrics).
  return reasons.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "crit" ? -1 : 1));
}
