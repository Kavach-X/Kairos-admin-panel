import type { EventExportRow } from "@/lib/actions/event.actions";

const CSV_HEADER = ["Event ID", "Detected at", "Status", "Edge label", "Edge confidence", "Device", "Thumbnail link", "Video link(s)"];

/** Quotes a CSV cell; leading = + - @ are prefixed so spreadsheets never run a cell as a formula. */
const cell = (v: string | number | null | undefined) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function toCsv(rows: EventExportRow[]) {
  const lines = rows.map((r) =>
    [
      r.eventId,
      r.detectedAt,
      r.status,
      r.edgeLabel,
      r.edgeConfidence == null ? "" : `${Math.round(r.edgeConfidence * 1000) / 10}%`,
      r.deviceId,
      r.thumbnailUrl,
      r.videoUrls.join("\n"),
    ]
      .map(cell)
      .join(",")
  );
  return [CSV_HEADER.map(cell).join(","), ...lines].join("\r\n");
}
