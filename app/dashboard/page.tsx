import { Suspense } from "react";
import Link from "next/link";
import { ChartColumn } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewKpis } from "@/components/dashboard/overview/overview-kpis";
import { NeedsAttention } from "@/components/dashboard/overview/needs-attention";
import { RecentEvents } from "@/components/dashboard/overview/recent-events";
import { FleetHealth } from "@/components/dashboard/overview/fleet-health";
import { DailyOutcomesChart } from "@/components/dashboard/analytics/daily-outcomes-chart";
import { getOverviewInsights } from "@/lib/data/overview-data";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Platform Overview</h1>
          <p className="text-xs text-muted-foreground">What the cameras saw, what needs action, and how the fleet is doing</p>
        </div>
        <Link href="/dashboard/analytics" className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
          <ChartColumn className="size-3.5" />
          Full analytics
        </Link>
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <OverviewKpis />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<CardSkeleton bodyClass="h-72" />}>
            <WeekTrend />
          </Suspense>
        </div>
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <NeedsAttention />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<CardSkeleton rows={8} thumbs />}>
            <RecentEvents />
          </Suspense>
        </div>
        <Suspense fallback={<CardSkeleton bodyClass="h-80" />}>
          <FleetHealth />
        </Suspense>
      </div>
    </div>
  );
}

async function WeekTrend() {
  const res = await getOverviewInsights(7);
  if (!res.data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-xs text-muted-foreground">
        Couldn&apos;t load the 7-day trend{res.error ? `: ${res.error}` : ""}
      </div>
    );
  }
  return (
    <DailyOutcomesChart
      daily={res.data.daily}
      title="Events, last 7 days"
      subtitle="Every detection per day, by how it ended"
      heightClass="h-56"
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border/60 bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ rows = 0, thumbs = false, bodyClass }: { rows?: number; thumbs?: boolean; bodyClass?: string }) {
  return (
    <div className="h-full rounded-lg border border-border/60 bg-card" aria-busy="true">
      <div className="space-y-1.5 border-b border-border/40 px-4 py-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-48" />
      </div>
      {bodyClass ? (
        <div className="p-4">
          <Skeleton className={`w-full ${bodyClass}`} />
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              {thumbs ? <Skeleton className="h-10 w-14 shrink-0" /> : <Skeleton className="size-4 shrink-0 rounded-full" />}
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-56" />
              </div>
              <Skeleton className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
