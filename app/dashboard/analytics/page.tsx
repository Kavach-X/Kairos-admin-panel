import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventInsightsAction } from "@/lib/actions/event.actions";
import { getAnalyticsFilterOptions } from "@/lib/data/reference-data";
import { AnalyticsView, type AnalyticsFilters } from "@/components/dashboard/analytics/analytics-view";
import { RANGE_PRESETS } from "@/components/dashboard/analytics/range-presets";

type SearchParams = Promise<{ days?: string; device?: string; customer?: string }>;

export default function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="pb-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Event Analytics</h1>
        <p className="text-xs text-muted-foreground">
          Detection volume, AI filtering, alert speed and the devices behind them
        </p>
      </div>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AnalyticsData({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const days = (RANGE_PRESETS as readonly number[]).includes(Number(sp.days)) ? Number(sp.days) : 30;
  const filters: AnalyticsFilters = { days, deviceId: sp.device || undefined, accountId: sp.customer || undefined };

  const [insightsRes, options] = await Promise.all([
    getEventInsightsAction(filters),
    getAnalyticsFilterOptions(),
  ]);

  return (
    <AnalyticsView
      insights={insightsRes.success && insightsRes.data ? insightsRes.data : null}
      error={insightsRes.error}
      filters={filters}
      options={options}
    />
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-52" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/60 bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/60 bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <Skeleton className="h-3 w-28 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
