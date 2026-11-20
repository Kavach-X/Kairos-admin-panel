import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getDashboardStatsAction } from "@/lib/actions/dashboard.actions";
import { getOverviewDevices, isDeployed, isOnline, lastSeenOf } from "@/lib/data/overview-data";
import { CardShell } from "@/components/dashboard/analytics/viz";
import { FleetDeploymentChart } from "@/components/dashboard/fleet-deployment-dial";
import { TimeAgo } from "./time-ago";

/** Where the hardware is (deployment dial) and which deployed boxes have gone quiet. */
export async function FleetHealth() {
  const [statsRes, devicesRes] = await Promise.all([getDashboardStatsAction(), getOverviewDevices()]);
  const s = statsRes.data;
  const deployed = (devicesRes.data?.items ?? []).filter(isDeployed);
  const online = deployed.filter(isOnline);
  const degraded = online.filter((d) => (d.operational_status ?? d.runtimeState?.operational_status) === "DEGRADED").length;
  // Most recently lost first: those are the likeliest to be a fresh outage.
  const offline = deployed
    .filter((d) => !isOnline(d))
    .sort((a, b) => (lastSeenOf(b) ?? "").localeCompare(lastSeenOf(a) ?? ""));

  return (
    <CardShell
      title="Fleet health"
      subtitle={`${s?.devices.total ?? 0} devices · ${s?.cameras.total ?? 0} cameras · ${s?.customers.total ?? 0} customers`}
      info="Where all the hardware is (with customers, in stock, with vendors, in repair) and whether the installed boxes are connected. Offline boxes are listed with when they were last heard from."
      className="h-full"
      action={
        <Link href="/dashboard/devices" className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
          Devices
          <ArrowUpRight className="size-3" />
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Online", value: online.length - degraded, dot: "bg-emerald-500" },
          { label: "Degraded", value: degraded, dot: "bg-amber-500" },
          { label: "Offline", value: offline.length, dot: "bg-red-500" },
        ].map((c) => (
          <div key={c.label} className="rounded-md border border-border/50 py-2">
            <div className="text-lg font-semibold text-foreground">{c.value}</div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <span className={`size-1.5 rounded-full ${c.dot}`} />
              {c.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <FleetDeploymentChart
          totalDevices={s?.devices.total ?? 0}
          deployedDevices={s?.devices.deployed ?? 0}
          inStockDevices={s?.devices.inStock ?? 0}
          withVendorDevices={s?.devices.withVendor ?? 0}
          maintenanceDevices={s?.devices.maintenance ?? 0}
        />
      </div>

      {offline.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-3">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Offline devices</p>
          <ul className="space-y-1">
            {offline.slice(0, 5).map((d) => (
              <li key={d.device_id}>
                <Link
                  href={`/dashboard/devices/${encodeURIComponent(d.device_id)}`}
                  className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-mono font-medium text-foreground">{d.device_id}</span>
                    <span className="text-muted-foreground"> · {d.ownerBusinessAccount?.name ?? "Unassigned"}</span>
                  </span>
                  <TimeAgo iso={lastSeenOf(d)} fallback="never seen" className="shrink-0 text-[11px] text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
          {offline.length > 5 && (
            <Link href="/dashboard/devices" className="mt-1.5 block px-1.5 text-[11px] text-muted-foreground hover:text-foreground">
              +{offline.length - 5} more
            </Link>
          )}
        </div>
      )}
    </CardShell>
  );
}
