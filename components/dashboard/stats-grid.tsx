import { Card, CardContent } from "@/components/ui/card";
import { getDashboardStatsAction } from "@/lib/actions/dashboard.actions";

interface StatItem {
  title: string;
  value: string;
  unit?: string;
  change: string;
  changeType: "positive" | "warning";
  subtext: string;
}

export async function StatsGrid() {
  const statsRes = await getDashboardStatsAction();
  const s = statsRes.success && statsRes.data ? statsRes.data : null;

  const totalDevices = s?.devices.total ?? 0;
  const deployedDevices = s?.devices.deployed ?? 0;
  const inStockDevices = s?.devices.inStock ?? 0;

  const totalCustomers = s?.customers.total ?? 0;
  const totalCameras = s?.cameras.total ?? 0;

  const totalEventsAll = s?.events.total ?? 0;
  const events24hCount = s?.events.last24h ?? 0;
  const importantAlerts = s?.events.importantAlerts24h ?? 0;

  const totalVendors = s?.vendors.total ?? 0;
  const verifiedVendors = s?.vendors.verified ?? 0;
  const pendingVendors = s?.vendors.pending ?? 0;

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
      value: String(totalVendors),
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
