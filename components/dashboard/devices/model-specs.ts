import type { DeviceModelSpecs } from "@/lib/types";

/**
 * Model specs arrive in two spellings: the create form writes camelCase (ramGb, soc, npuTops, maxStreams)
 * while seeded models use snake_case (ram_gb, chipset, npu_tops, max_cameras). Read both.
 */
export interface ModelSpecs {
  processor: string | null;
  aiTops: number | null;
  ramGb: number | null;
  storageGb: number | null;
  maxCameras: number | null;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : typeof v === "string" && Number(v) > 0 ? Number(v) : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function readModelSpecs(specs: DeviceModelSpecs | null | undefined): ModelSpecs {
  const s = (specs ?? {}) as Record<string, unknown>;
  return {
    processor: str(s.soc) ?? str(s.chipset) ?? str(s.processor),
    aiTops: num(s.npuTops) ?? num(s.npu_tops),
    ramGb: num(s.ramGb) ?? num(s.ram_gb),
    storageGb: num(s.storageGb) ?? num(s.storage_gb),
    maxCameras: num(s.maxStreams) ?? num(s.max_cameras) ?? num(s.max_streams),
  };
}

/** Label / value rows for a model's specs; missing values are left out. */
export function modelSpecRows(specs: DeviceModelSpecs | null | undefined) {
  const m = readModelSpecs(specs);
  return [
    { label: "Processor", value: m.processor },
    { label: "AI compute", value: m.aiTops !== null ? `${m.aiTops} TOPS` : null },
    { label: "RAM", value: m.ramGb !== null ? `${m.ramGb} GB` : null },
    { label: "Storage", value: m.storageGb !== null ? `${m.storageGb} GB` : null },
    { label: "Max cameras", value: m.maxCameras !== null ? String(m.maxCameras) : null },
  ].filter((r): r is { label: string; value: string } => r.value !== null);
}

// Every spelling a spec has been saved under; replaced by the canonical key on save.
const ALIASES = ["soc", "chipset", "processor", "npuTops", "npu_tops", "ramGb", "ram_gb", "storageGb", "storage_gb", "maxStreams", "max_cameras", "max_streams"];

/**
 * Specs to save, in the snake_case keys the backend reads (camera.service uses specs.max_cameras for the
 * camera limit). Unknown keys already on the model are kept; empty fields are left out, never defaulted.
 */
export function toModelSpecs(existing: DeviceModelSpecs | null | undefined, next: ModelSpecs): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(existing ?? {})) if (!ALIASES.includes(k)) out[k] = v;
  if (next.processor) out.chipset = next.processor;
  if (next.aiTops !== null) out.npu_tops = next.aiTops;
  if (next.ramGb !== null) out.ram_gb = next.ramGb;
  if (next.storageGb !== null) out.storage_gb = next.storageGb;
  if (next.maxCameras !== null) out.max_cameras = next.maxCameras;
  return out;
}
