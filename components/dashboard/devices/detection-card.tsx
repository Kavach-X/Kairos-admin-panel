import type { DevicePipelineStatus } from "@/lib/types";
import type { Status } from "./telemetry-utils";

export const PIPELINE_STATE: Record<DevicePipelineStatus, { title: string; hint: string; status: Status | null }> = {
  running: { title: "Detecting", hint: "Watching the camera", status: "ok" },
  idle_no_camera: { title: "No camera connected", hint: "Detection starts once a camera is added", status: null },
  stopped: { title: "Not detecting", hint: "A camera is set up but detection isn't running", status: "crit" },
};
