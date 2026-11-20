import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, CircleAlert, Info } from "lucide-react";
import { getDashboardStatsAction } from "@/lib/actions/dashboard.actions";
import { getOverviewDevices, getOverviewInsights, isDeployed, isOnline } from "@/lib/data/overview-data";
import { CardShell } from "@/components/dashboard/analytics/viz";
import { formatNumber } from "@/components/dashboard/analytics/format";

type Severity = "critical" | "warning" | "info";

interface Item {
  severity: Severity;
  count: number;
  title: string;
  detail: string;
  href: string;
}

// Status color always travels with an icon + text, never alone.
const SEVERITY: Record<Severity, { icon: typeof AlertTriangle; className: string; label: string }> = {
  critical: { icon: CircleAlert, className: "text-red-600 dark:text-red-400", label: "Urgent" },
  warning: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400", label: "Check" },
  info: { icon: Info, className: "text-sky-600 dark:text-sky-400", label: "To do" },
};

/** Things someone should act on, most urgent first; hidden when zero. */
export async function NeedsAttention() {
  const [statsRes, dayRes, weekRes, devicesRes] = await Promise.all([
    getDashboardStatsAction(),
    getOverviewInsights(1),
    getOverviewInsights(7),
    getOverviewDevices(),
  ]);
  const stats = statsRes.data;
  const day = dayRes.data;
  const week = weekRes.data;
  const devices = devicesRes.data?.items ?? [];
  const offline = devices.filter((d) => isDeployed(d) && !isOnline(d)).length;
  const maintenance = devices.filter((d) => d.inventory_status === "MAINTENANCE").length;
  const stuck = week ? week.pipeline.stuckThumbnails + week.pipeline.stuckVideos : 0;
  const failed = week ? week.pipeline.failedThumbnails + week.pipeline.failedVideos : 0;

  const items: Item[] = [
    {
      severity: "critical" as const,
      count: offline,
      title: `${offline === 1 ? "Device" : "Devices"} offline`,
      detail: "Installed at a customer site but not connected",
      href: "/dashboard/devices",
    },
    {
      severity: "warning" as const,
      count: day?.totals.confirmed ?? 0,
      title: "Confirmed threats today",
      detail: "Real incidents in the last 24 hours",
      href: "/dashboard/activity?tab=confirmed&range=24h",
    },
    {
      severity: "warning" as const,
      count: stuck,
      title: "Media stuck in AI",
      detail: "Still waiting more than 10 minutes (last 7 days)",
      href: "/dashboard/analytics?days=7",
    },
    {
      severity: "warning" as const,
      count: failed,
      title: "AI analysis failures",
      detail: "Photos or clips the AI could not check (last 7 days)",
      href: "/dashboard/analytics?days=7",
    },
    {
      severity: "info" as const,
      count: stats?.tickets.open ?? 0,
      title: "Open support tickets",
      detail: "Waiting for review or a technician",
      href: "/dashboard/tickets",
    },
    {
      severity: "info" as const,
      count: stats?.vendors.pending ?? 0,
      title: "Vendor approvals",
      detail: "Partners waiting for verification",
      href: "/dashboard/vendors",
    },
    {
      severity: "info" as const,
      count: maintenance,
      title: "Devices in maintenance",
      detail: "Pulled for diagnostics or repair",
      href: "/dashboard/devices",
    },
  ].filter((i) => i.count > 0);

  return (
    <CardShell
      title="Needs attention"
      subtitle={items.length ? `${items.length} ${items.length === 1 ? "item" : "items"} to look at` : "Nothing waiting on you"}
      info="A to-do list built from live data: offline devices, real threats, AI problems, tickets and approvals. Only items that need action are shown. Click one to go where you can fix it."
      className="h-full"
    >
      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-medium text-foreground">All clear</p>
            <p className="text-[11px] text-muted-foreground">Devices are reporting and nothing is waiting for review.</p>
          </div>
        </div>
      ) : (
        <ul className="-mx-4 -my-4 divide-y divide-border/40">
          {items.map((item) => {
            const sev = SEVERITY[item.severity];
            const Icon = sev.icon;
            return (
              <li key={item.title}>
                <Link href={item.href} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30">
                  <Icon className={`size-4 shrink-0 ${sev.className}`} aria-label={sev.label} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground group-hover:text-primary">
                      <span className="font-mono">{formatNumber(item.count)}</span> {item.title}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}
