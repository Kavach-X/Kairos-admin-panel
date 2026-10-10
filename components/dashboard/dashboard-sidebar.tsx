import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import { getDevicesAction } from "@/lib/actions/device.actions";
import { getTicketsAction } from "@/lib/actions/ticket.actions";
import { getVendorsAction } from "@/lib/actions/vendor.actions";
import { FleetDeploymentChart } from "@/components/dashboard/fleet-deployment-dial";

export async function DashboardSidebar() {
  const [devicesRes, ticketsRes, vendorsRes] = await Promise.allSettled([
    getDevicesAction({ limit: 250 }),
    getTicketsAction(),
    getVendorsAction(),
  ]);

  const devices =
    devicesRes.status === "fulfilled" && devicesRes.value.success
      ? devicesRes.value.data?.items || []
      : [];
  const tickets =
    ticketsRes.status === "fulfilled" && ticketsRes.value.success
      ? ticketsRes.value.data || []
      : [];
  const vendors =
    vendorsRes.status === "fulfilled" && vendorsRes.value.success
      ? vendorsRes.value.data || []
      : [];

  const totalDevices = devices.length;
  const deployedDevices = devices.filter(
    (d) => d.inventory_status === "INSTALLED" || d.inventory_status === "ASSIGNED"
  ).length;
  const inStockDevices = devices.filter(
    (d) => d.inventory_status === "IN_STOCK"
  ).length;
  const withVendorDevices = devices.filter(
    (d) => d.inventory_status === "WITH_VENDOR"
  ).length;
  const maintenanceDevices = devices.filter(
    (d) => d.inventory_status === "MAINTENANCE"
  ).length;

  const openTickets = tickets.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
  ).length;
  const pendingVendors = vendors.filter(
    (v) => v.verificationStatus === "PENDING"
  ).length;

  return (
    <Card className="border-border/50 bg-card shadow-none">
      {/* Fleet Allocation Header */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fleet Deployment
        </CardTitle>
        <Link
          href="/dashboard/devices"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Fleet</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 pb-3">
        <FleetDeploymentChart
          totalDevices={totalDevices}
          deployedDevices={deployedDevices}
          inStockDevices={inStockDevices}
          withVendorDevices={withVendorDevices}
          maintenanceDevices={maintenanceDevices}
        />
      </CardContent>

      {/* Quick Navigation & Active Triage */}
      <div className="border-t border-border/40">
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Quick Navigation
          </span>
        </div>

        <div className="divide-y divide-border/40">
          {openTickets > 0 && (
            <Link
              href="/dashboard/tickets"
              className="group flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  Support Tickets
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                  {openTickets} open
                </span>
                <ChevronRight className="size-3 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          )}

          {pendingVendors > 0 && (
            <Link
              href="/dashboard/vendors"
              className="group flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  Partner Approvals
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                  {pendingVendors} pending
                </span>
                <ChevronRight className="size-3 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          )}

          <Link
            href="/dashboard/devices"
            className="group flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
              Edge Devices
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                Register & manage
              </span>
              <ChevronRight className="size-3 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>

          <Link
            href="/dashboard/customers"
            className="group flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
              Customer Stores
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                Locations & feeds
              </span>
              <ChevronRight className="size-3 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        </div>
      </div>
    </Card>
  );
}
