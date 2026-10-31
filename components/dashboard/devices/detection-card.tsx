import type { DevicePipelineStatus } from "@/lib/types";
import { StatusDot } from "./status-dot";
import type { Status } from "./telemetry-utils";

export interface DetectionInfo {
  /** Null = never reported. */
  pipeline: DevicePipelineStatus | null;
  /** camera id -> reachable. Null = not known (no live check yet). */
  cameras: [string, boolean][] | null;
  /** State of the AI chip, e.g. "running". Null = not known. */
  npuState: string | null;
  /** How fresh the info is, e.g. "from live check 2m ago". */
  source: React.ReactNode;
  /** Future fields (last frame time, inference speed...) slot in here as plain label/value rows. */
  extras?: { label: string; value: string }[];
}

export const PIPELINE_STATE: Record<DevicePipelineStatus, { title: string; hint: string; status: Status | null }> = {
  running: { title: "Detecting", hint: "Watching the camera", status: "ok" },
  idle_no_camera: { title: "No camera connected", hint: "Detection starts once a camera is added", status: null },
  stopped: { title: "Not detecting", hint: "A camera is set up but detection isn't running", status: "crit" },
};

/** What the AI side of the device is doing. "No camera" is a neutral state, never a warning. */
export function DetectionCard({ info, loading = false }: { info: DetectionInfo; loading?: boolean }) {
  const state = info.pipeline ? PIPELINE_STATE[info.pipeline] : null;
  const showCameras = info.pipeline !== "idle_no_camera" && info.cameras !== null && info.cameras.length > 0;
  const rows: { label: string; value: string }[] = [];
  if (info.npuState)
    rows.push({ label: "AI chip", value: info.npuState.toLowerCase() === "running" ? "On and ready" : info.npuState });
  rows.push(...(info.extras ?? []));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <span className="text-xs font-medium text-muted-foreground">Detection</span>

      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-44 animate-pulse rounded bg-muted/40" />
        </div>
      ) : state ? (
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            {state.status && <StatusDot status={state.status} />}
            {state.title}
          </span>
          <span className="text-xs text-muted-foreground">{state.hint}</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Not reported yet</span>
      )}

      {!loading && showCameras && (
        <ul className="flex flex-col gap-1.5">
          {info.cameras!.map(([id, ok]) => (
            <li key={id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-foreground" title={id}>
                {id}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                <StatusDot status={ok ? "ok" : "crit"} />
                {ok ? "Reachable" : "Unreachable"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && rows.length > 0 && (
        <dl className="flex flex-col gap-1 border-t border-border/50 pt-2 text-xs">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!loading && info.source && <span className="mt-auto text-[11px] text-muted-foreground">{info.source}</span>}
    </div>
  );
}
