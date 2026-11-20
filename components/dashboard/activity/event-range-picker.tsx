"use client";

import * as React from "react";
import { CalendarRange, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNow } from "@/components/dashboard/use-now";
import { EVENT_RANGES, type EventFilters, type EventRangeKey } from "./event-filters";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → value for <input type="datetime-local"> in the browser's own time zone. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

const SELECT_CLASS =
  "h-8 rounded-md border border-border/50 bg-card px-2.5 text-xs text-foreground/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * Time-range control: presets in a select; "Custom range…" opens From / To date-time fields.
 * Bounds are entered in the browser's local time and stored as ISO (UTC) in the filters / URL.
 */
export function EventRangePicker({
  filters,
  onChange,
}: {
  filters: EventFilters;
  onChange: (range: EventRangeKey, from?: string, to?: string) => void;
}) {
  const now = useNow();
  const [editing, setEditing] = React.useState(false);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const openEditor = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setFrom(filters.from ? toLocalInput(filters.from) : toLocalInput(today.toISOString()));
    setTo(filters.to ? toLocalInput(filters.to) : toLocalInput(new Date().toISOString()));
    setError(null);
    setEditing(true);
  };

  const apply = () => {
    if (!from && !to) return setError("Pick a start or an end time.");
    const fromIso = from ? new Date(from).toISOString() : undefined;
    const toIso = to ? new Date(to).toISOString() : undefined;
    if (fromIso && toIso && fromIso >= toIso) return setError("The start must be before the end.");
    setEditing(false);
    onChange("custom", fromIso, toIso);
  };

  return (
    <>
      <select
        aria-label="Time range"
        value={editing ? "custom" : filters.range}
        onChange={(e) => {
          const range = e.target.value as EventRangeKey;
          if (range === "custom") return openEditor();
          setEditing(false);
          onChange(range);
        }}
        className={SELECT_CLASS}
      >
        {EVENT_RANGES.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>

      {filters.range === "custom" && !editing && now !== null && (
        <span className="flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 pl-2.5 pr-1 text-xs text-foreground">
          <CalendarRange className="size-3.5 text-primary" />
          {filters.from ? fmt(filters.from) : "Beginning"} → {filters.to ? fmt(filters.to) : "now"}
          <button type="button" aria-label="Edit range" onClick={openEditor} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <Pencil className="size-3" />
          </button>
          <button type="button" aria-label="Clear range" onClick={() => onChange("all")} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="size-3" />
          </button>
        </span>
      )}

      {editing && (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-md border border-border/60 bg-card p-2 sm:w-auto">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            From
            <input
              type="datetime-local"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-7 rounded border border-border/60 bg-background px-1.5 text-xs text-foreground"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            To
            <input
              type="datetime-local"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-7 rounded border border-border/60 bg-background px-1.5 text-xs text-foreground"
            />
          </label>
          <Button size="sm" className="h-7 text-xs" onClick={apply}>
            Apply
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          {error && <span className="basis-full text-[11px] text-destructive">{error}</span>}
        </div>
      )}
    </>
  );
}
