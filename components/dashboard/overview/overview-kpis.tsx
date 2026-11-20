import { AlertTriangle, Check } from "lucide-react";
import { getDashboardStatsAction } from "@/lib/actions/dashboard.actions";
import { getOverviewDevices, getOverviewInsights, isDeployed, isOnline } from "@/lib/data/overview-data";
import { Delta, StatTile } from "@/components/dashboard/stat-tile";
import { formatCompact, formatNumber, formatPct } from "@/components/dashboard/analytics/format";

/** Headline numbers: fleet connectivity, the last 24h of events, and open work. */
export async function OverviewKpis() {
  const [statsRes, insightsRes, devicesRes] = await Promise.all([
    getDashboardStatsAction(),
    getOverviewInsights(1),
    getOverviewDevices(),
  ]);
  const stats = statsRes.data;
  const day = insightsRes.data;
  const deployed = (devicesRes.data?.items ?? []).filter(isDeployed);
  const online = deployed.filter(isOnline).length;
  const offline = deployed.length - online;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile
        label="Devices online"
        value={devicesRes.success ? `${online}/${deployed.length}` : "–"}
        note="deployed"
        info="Out of the boxes installed at customer sites, how many are connected right now. An offline box cannot detect anything, so these need a look."
        footer={
          !devicesRes.success ? (
            <span className="text-[11px] text-muted-foreground">Device status unavailable</span>
          ) : offline > 0 ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3" />
              {offline} offline
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
              <Check className="size-3" />
              All reporting
            </span>
          )
        }
      />
      <StatTile
        label="Events (24h)"
        value={day ? formatCompact(day.totals.total) : "–"}
        info="Everything the cameras noticed in the last 24 hours. The line below compares with the 24 hours before."
        footer={day && <Delta now={day.totals.total} prev={day.previousTotals.total} periodLabel="previous 24h" />}
      />
      <StatTile
        label="Confirmed threats (24h)"
        swatch="var(--viz-confirmed)"
        value={day ? formatNumber(day.totals.confirmed) : "–"}
        info="Real incidents in the last 24 hours, as decided by our AI or our team. Customers are alerted about these."
        footer={day && <span className="text-[11px] text-muted-foreground">{formatNumber(day.alerts.dispatched)} customer alerts sent</span>}
      />
      <StatTile
        label="Filtered by AI (24h)"
        swatch="var(--viz-false-alarm)"
        value={day ? formatPct(day.totals.falseAlarm, day.totals.total) : "–"}
        info="The share of the last 24 hours' events that our AI found were not real (steam, light flicker, normal movement), so customers were never disturbed."
        footer={day && <span className="text-[11px] text-muted-foreground">{formatNumber(day.totals.falseAlarm)} false alarms blocked</span>}
      />
      <StatTile
        label="Open tickets"
        value={stats ? formatNumber(stats.tickets.open) : "–"}
        info="Support tickets that are still open or being worked on. The line below shows vendor partners waiting for approval."
        footer={
          stats && (
            <span className="text-[11px] text-muted-foreground">
              {stats.vendors.pending > 0 ? `${stats.vendors.pending} vendor approvals pending` : "No vendor approvals pending"}
            </span>
          )
        }
      />
    </div>
  );
}
