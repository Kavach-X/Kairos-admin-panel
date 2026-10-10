import { Card, CardContent } from "@/components/ui/card";
import { getDevicesAction } from "@/lib/actions/device.actions";
import { getVendorsAction } from "@/lib/actions/vendor.actions";
import { getCustomersAction } from "@/lib/actions/customer.actions";
import { getEventsAction } from "@/lib/actions/event.actions";

interface StatItem {
  title: string;
  value: string;
  unit?: string;
  change: string;
  changeType: "positive" | "warning";
  subtext: string;
}

export async function StatsGrid() {
  const past24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [devicesRes, vendorsRes, customersRes, eventsRes, events24hRes] =
    await Promise.allSettled([
      getDevicesAction({ limit: 250 }),
      getVendorsAction(),
      getCustomersAction(),
      getEventsAction({ limit: 100 }),
      getEventsAction({ startDate: past24hIso, limit: 1 }),
    ]);

  const devices =
    devicesRes.status === "fulfilled" && devicesRes.value.success
      ? devicesRes.value.data?.items || []
      : [];
  const vendors =
    vendorsRes.status === "fulfilled" && vendorsRes.value.success
      ? vendorsRes.value.data || []
      : [];
  const customers =
    customersRes.status === "fulfilled" && customersRes.value.success
      ? customersRes.value.data || []
      : [];
  const events =
    eventsRes.status === "fulfilled" && eventsRes.value.success
      ? eventsRes.value.data?.items || []
      : [];

  const totalDevices = devices.length;
  const deployedDevices = devices.filter(
    (d) => d.inventory_status === "INSTALLED" || d.inventory_status === "ASSIGNED"
  ).length;
  const inStockDevices = devices.filter(
    (d) => d.inventory_status === "IN_STOCK"
  ).length;

  const totalCustomers = customers.length;
  const totalCameras = customers.reduce(
    (acc, c) => acc + (c.totalCameras || 0),
    0
  );

  const totalEventsAll =
    eventsRes.status === "fulfilled" && eventsRes.value.success
      ? (eventsRes.value.data?.total ?? events.length)
      : 0;

  const events24hCount =
    events24hRes.status === "fulfilled" && events24hRes.value.success
      ? (events24hRes.value.data?.total ?? 0)
      : 0;

  const importantAlerts = events.filter(
    (e) => e.threatLevel === "CRITICAL" || e.threatLevel === "HIGH"
  ).length;

  const verifiedVendors = vendors.filter(
    (v) => v.verificationStatus === "VERIFIED"
  ).length;
  const pendingVendors = vendors.filter(
    (v) => v.verificationStatus === "PENDING"
  ).length;

  const stats: StatItem[] = [
    {
      title: "Edge Devices",
      value: String(totalDevices),
      change: `${deployedDevices} deployed`,
      changeType: "positive",
      subtext: `${inStockDevices} in warehouse stock`,
    },
    {
      title: "Camera Streams",
      value: String(totalCameras),
      change: `${totalCustomers} stores`,
      changeType: "positive",
      subtext: "active RTSP feeds",
    },
    {
      title: "Security Events",
      value: String(events24hCount),
      unit: "in 24h",
      change:
        importantAlerts > 0
          ? `${importantAlerts} alert${importantAlerts > 1 ? "s" : ""}`
          : "all clear",
      changeType: importantAlerts > 0 ? "warning" : "positive",
      subtext: `${totalEventsAll} total events`,
    },
    {
      title: "Partner Vendors",
      value: String(vendors.length),
      change: `${verifiedVendors} verified`,
      changeType: "positive",
      subtext: pendingVendors > 0 ? `${pendingVendors} pending review` : "all active",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const isPositive = stat.changeType === "positive";

        return (
          <Card
            key={stat.title}
            className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100"
          >
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </span>
                <span
                  className={`font-mono text-[11px] font-medium ${
                    isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {stat.change}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="font-mono text-xs text-muted-foreground/80">
                      {stat.unit}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground/70">
                  {stat.subtext}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
