"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { AnalyticsFilterOptions, EventInsights, EventOutcomeCounts } from "@/lib/types";
import { DailyOutcomesChart } from "./daily-outcomes-chart";
import { FalseAlarmReasons, HourHeatmap, LabelBreakdown, NoisyDevices } from "./breakdowns";
import { formatCompact, formatDuration, formatNumber, formatPct } from "./viz";
import { Delta, StatTile } from "@/components/dashboard/stat-tile";
import { RANGE_PRESETS } from "./range-presets";


export interface AnalyticsFilters {
  days: number;
  deviceId?: string;
  accountId?: string;
}

function OutcomeTiles({ totals, prev, days }: { totals: EventOutcomeCounts; prev: EventOutcomeCounts; days: number }) {
  const tiles: Array<{ key: keyof EventOutcomeCounts; label: string; swatch?: string; note?: string; info: string }> = [
    {
      key: "total",
      label: "Total events",
      info: `Every time a camera noticed something (like smoke, fire or a person) in the last ${days} days. Each one is then double-checked by our cloud AI. The small arrow compares with the ${days} days just before.`,
    },
    {
      key: "confirmed",
      label: "Confirmed threats",
      swatch: "var(--viz-confirmed)",
      note: formatPct(totals.confirmed, totals.total),
      info: "Events that turned out to be real, as decided by our AI or by a person on our team. Customers are alerted about these. The % is their share of all events.",
    },
    {
      key: "falseAlarm",
      label: "Filtered by AI",
      swatch: "var(--viz-false-alarm)",
      note: formatPct(totals.falseAlarm, totals.total),
      info: "Events our AI checked and found were not real, like steam, a light flicker or normal movement. Customers were never disturbed by these. A higher share means more noise is being blocked.",
    },
    {
      key: "dismissed",
      label: "Dismissed by operator",
      swatch: "var(--viz-dismissed)",
      note: formatPct(totals.dismissed, totals.total),
      info: "Events a person on our team looked at and marked as a false alarm by hand.",
    },
    {
      key: "pending",
      label: "In pipeline",
      swatch: "var(--viz-pending)",
      note: formatPct(totals.pending, totals.total),
      info: "Events still uploading from the camera or waiting for the AI's answer. A few is normal. A number that keeps growing means something is stuck.",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <StatTile
          key={t.key}
          label={t.label}
          swatch={t.swatch}
          value={formatCompact(totals[t.key])}
          note={t.note}
          info={t.info}
          footer={<Delta now={totals[t.key]} prev={prev[t.key]} periodLabel={`previous ${days}d`} />}
        />
      ))}
    </div>
  );
}

function PipelineTiles({ insights }: { insights: EventInsights }) {
  const { pipeline, alerts, review } = insights;
  const failed = pipeline.failedThumbnails + pipeline.failedVideos;
  const stuck = pipeline.stuckThumbnails + pipeline.stuckVideos;
  const issues = failed + stuck;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Time to AI verdict"
        value={formatDuration(pipeline.aiLatencyP50Sec)}
        note="median"
        info="How long it takes from the camera noticing something to our AI giving its answer. Median means half of the events were faster than this. The line below shows the time that 95 out of 100 events beat."
        footer={
          <span className="text-[11px] text-muted-foreground">
            95% within {formatDuration(pipeline.aiLatencyP95Sec)} · {formatNumber(pipeline.analyzed)} analysed
          </span>
        }
      />
      <StatTile
        label="Time to customer alert"
        value={formatDuration(alerts.dispatchP50Sec)}
        note="median"
        info="How long it takes from the camera noticing a real threat to the customer getting the alert. Lower is better."
        footer={<span className="text-[11px] text-muted-foreground">{formatNumber(alerts.dispatched)} alerts sent</span>}
      />
      <StatTile
        label="Operator overrides"
        value={formatNumber(review.aiMissedThreat + review.aiFalseAlarm)}
        info="How often our team disagreed with the AI after looking at an event. A missed threat means the AI said false alarm but it was real. A false positive means the AI said threat but it wasn't. Lower means the AI can be trusted more."
        note={`of ${formatNumber(review.reviewed)} reviewed`}
        footer={
          <span className="text-[11px] text-muted-foreground">
            {formatNumber(review.aiMissedThreat)} missed {review.aiMissedThreat === 1 ? "threat" : "threats"} ·{" "}
            {formatNumber(review.aiFalseAlarm)} false {review.aiFalseAlarm === 1 ? "positive" : "positives"}
          </span>
        }
      />
      <StatTile
        label="Pipeline issues"
        value={formatNumber(issues)}
        info="Photos or video clips the AI could not check, or that are still waiting more than 10 minutes after the event. This should be close to zero. If it isn't, the AI server needs a look."
        footer={
          issues > 0 ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3" />
              {formatNumber(failed)} failed · {formatNumber(stuck)} stuck over 10 min
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
              <Check className="size-3" />
              No failed or stuck media
            </span>
          )
        }
      />
    </div>
  );
}

function FilterBar({
  filters,
  options,
  onChange,
  pending,
}: {
  filters: AnalyticsFilters;
  options: AnalyticsFilterOptions;
  onChange: (next: AnalyticsFilters) => void;
  pending: boolean;
}) {
  // The leading "All" entry (empty value) clears that one filter.
  const deviceOptions = [
    { value: "", label: "All devices" },
    ...options.devices
      .filter((d) => !filters.accountId || d.accountId === filters.accountId)
      .map((d) => ({ value: d.deviceId, label: d.deviceId, subLabel: d.accountName ?? "Unassigned" })),
  ];
  const customerOptions = [{ value: "", label: "All customers" }, ...options.customers.map((c) => ({ value: c.id, label: c.name }))];
  const active = Boolean(filters.deviceId || filters.accountId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md border border-border/60 bg-card p-0.5 text-xs" role="radiogroup" aria-label="Time range">
        {RANGE_PRESETS.map((d) => (
          <button
            key={d}
            role="radio"
            aria-checked={filters.days === d}
            onClick={() => onChange({ ...filters, days: d })}
            className={`rounded px-2.5 py-1 transition-colors ${
              filters.days === d ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last {d} days
          </button>
        ))}
      </div>

      <SearchableSelect
        className="w-48"
        options={customerOptions}
        value={filters.accountId ?? ""}
        onValueChange={(v) => {
          const keepDevice = options.devices.some((d) => d.deviceId === filters.deviceId && d.accountId === v);
          onChange({ ...filters, accountId: v || undefined, deviceId: keepDevice ? filters.deviceId : undefined });
        }}
        placeholder="All customers"
        searchPlaceholder="Search customers..."
      />
      <SearchableSelect
        className="w-52"
        options={deviceOptions}
        value={filters.deviceId ?? ""}
        onValueChange={(v) => onChange({ ...filters, deviceId: v || undefined })}
        placeholder="All devices"
        searchPlaceholder="Search devices..."
      />

      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground"
          onClick={() => onChange({ days: filters.days })}
        >
          <X className="size-3.5" />
          Clear
        </Button>
      )}
      {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Updating" />}
    </div>
  );
}

export function AnalyticsView({
  insights,
  error,
  filters,
  options,
}: {
  insights: EventInsights | null;
  error?: string;
  filters: AnalyticsFilters;
  options: AnalyticsFilterOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();

  // Filters live in the URL (shareable, back-button friendly); the server re-renders the data.
  // The transition keeps the current charts on screen, dimmed, until the new data arrives.
  const navigate = (next: AnalyticsFilters) => {
    const params = new URLSearchParams();
    if (next.days !== 30) params.set("days", String(next.days));
    if (next.accountId) params.set("customer", next.accountId);
    if (next.deviceId) params.set("device", next.deviceId);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterBar filters={filters} options={options} onChange={navigate} pending={pending} />

      <div className={`flex flex-col gap-4 transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
        {!insights ? (
          <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Couldn&apos;t load analytics</p>
            <p className="mt-1 text-xs text-muted-foreground">{error || "The insights service did not respond."}</p>
            <Button variant="outline" size="sm" className="mt-3 h-8 gap-1.5 text-xs" onClick={() => startTransition(() => router.refresh())}>
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            <OutcomeTiles totals={insights.totals} prev={insights.previousTotals} days={filters.days} />
            <PipelineTiles insights={insights} />

            {insights.totals.total === 0 ? (
              <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-xs text-muted-foreground">
                No events in the last {filters.days} days for this selection.
              </div>
            ) : (
              <>
                <DailyOutcomesChart daily={insights.daily} />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <LabelBreakdown labels={insights.labels} />
                  <FalseAlarmReasons reasons={insights.falseAlarmReasons} falseAlarms={insights.totals.falseAlarm} />
                </div>
                <HourHeatmap heatmap={insights.heatmap} tz={insights.range.tz} />
                {!filters.deviceId && <NoisyDevices devices={insights.devices} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
