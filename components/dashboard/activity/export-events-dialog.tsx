"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportEventsAction } from "@/lib/actions/event.actions";
import { EventRangePicker } from "./event-range-picker";
import { toCsv } from "./events-csv";
import { EVENT_TABS, eventFiltersToRequest, type EventFilters } from "./event-filters";

// The "All" tab is every status, so the dialog offers the individual groups.
const STATUS_GROUPS = EVENT_TABS.filter((t) => t.statuses.length > 0);

function download(filename: string, csv: string) {
  // BOM so Excel reads the file as UTF-8.
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportEventsDialog({
  open,
  onOpenChange,
  initialFilters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Seeds the dialog from the page's current tab and time range. */
  initialFilters: EventFilters;
}) {
  const [range, setRange] = React.useState<EventFilters>({ tab: "all", range: "all" });
  const [groups, setGroups] = React.useState<Set<string>>(new Set());
  const [label, setLabel] = React.useState("");
  const [minConfidence, setMinConfidence] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setRange({ tab: "all", range: initialFilters.range, from: initialFilters.from, to: initialFilters.to });
    setGroups(new Set(initialFilters.tab === "all" ? [] : [initialFilters.tab]));
    setLabel("");
    setMinConfidence("");
  }, [open, initialFilters]);

  const toggle = (key: string) =>
    setGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleExport = async () => {
    const pct = minConfidence.trim() === "" ? undefined : Number(minConfidence);
    if (pct !== undefined && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
      toast.error("Minimum confidence must be between 0 and 100");
      return;
    }

    // No box ticked means every status.
    const statuses = STATUS_GROUPS.filter((g) => groups.has(g.key)).flatMap((g) => g.statuses);
    const { startDate, endDate } = eventFiltersToRequest(range);

    setLoading(true);
    try {
      const res = await exportEventsAction({
        status: statuses.length ? statuses.join(",") : undefined,
        label: label.trim() || undefined,
        minConfidence: pct === undefined ? undefined : pct / 100,
        startDate,
        endDate,
      });
      if (!res.success || !res.data) {
        toast.error(res.error || "Export failed");
        return;
      }
      if (res.data.items.length === 0) {
        toast.info("No events match these filters");
        return;
      }
      download(`kairos-events-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(res.data.items));
      toast.success(
        res.data.truncated
          ? `Exported the newest ${res.data.limit.toLocaleString("en-IN")} events. Narrow the date range to get the rest.`
          : `Exported ${res.data.items.length.toLocaleString("en-IN")} events.`
      );
      onOpenChange(false);
    } catch {
      toast.error("Network error exporting events");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export events</DialogTitle>
          <DialogDescription>
            Downloads a CSV with each event&apos;s status, edge label, confidence and links to its video and thumbnail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Date range</span>
            <div className="flex flex-wrap items-center gap-2">
              <EventRangePicker filters={range} onChange={(r, from, to) => setRange({ tab: "all", range: r, from, to })} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Status</span>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_GROUPS.map((g) => (
                <label key={g.key} className="flex items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" checked={groups.has(g.key)} onChange={() => toggle(g.key)} className="size-3.5 accent-primary" />
                  {g.label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Leave all unticked to include every status.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="export-label" className="text-xs font-medium text-foreground">
                Edge label
              </label>
              <Input id="export-label" placeholder="e.g. FIRE (any if empty)" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="export-conf" className="text-xs font-medium text-foreground">
                Min confidence (%)
              </label>
              <Input
                id="export-conf"
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 65"
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
