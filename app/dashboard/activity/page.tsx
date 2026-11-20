import { Suspense } from "react";
import { connection } from "next/server";
import { getEventsAction } from "@/lib/actions/event.actions";
import { getAnalyticsFilterOptions } from "@/lib/data/reference-data";
import { ActivityPageClient } from "@/components/dashboard/activity/activity-page-client";
import { eventFiltersToRequest, parseEventFilters } from "@/components/dashboard/activity/event-filters";
import { EventsPageSkeleton } from "@/components/dashboard/page-skeletons";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ActivityPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EventsPageSkeleton />}>
      <ActivityData searchParams={searchParams} />
    </Suspense>
  );
}

async function ActivityData({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // The time-range filter is relative to now: compute it per request, never at prerender.
  await connection();
  const filters = parseEventFilters(sp);
  const selected = typeof sp.event === "string" ? sp.event : undefined;

  const [eventsRes, options] = await Promise.all([
    getEventsAction({ ...eventFiltersToRequest(filters), limit: 30, includeCounts: true }),
    getAnalyticsFilterOptions(),
  ]);

  return (
    <ActivityPageClient
      initial={{
        events: eventsRes.success && eventsRes.data ? eventsRes.data.items : [],
        nextCursor: eventsRes.success && eventsRes.data ? eventsRes.data.nextCursor : null,
        statusCounts: eventsRes.data?.statusCounts,
        error: eventsRes.success ? undefined : eventsRes.error,
      }}
      initialFilters={filters}
      initialSelectedId={selected}
      options={options}
    />
  );
}
