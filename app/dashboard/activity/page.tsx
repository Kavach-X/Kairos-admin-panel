import { Suspense } from "react";
import { getEventsAction, getEventStatsAction } from "@/lib/actions/event.actions";
import { ActivityPageClient } from "@/components/dashboard/activity/activity-page-client";
import { ListPageSkeleton } from "@/components/dashboard/page-skeletons";

export default function ActivityPage() {
  return (
    <Suspense fallback={<ListPageSkeleton rows={10} />}>
      <ActivityData />
    </Suspense>
  );
}

async function ActivityData() {
  const [eventsRes, statsRes] = await Promise.all([
    getEventsAction({ page: 1, limit: 15 }),
    getEventStatsAction(),
  ]);

  return (
    <ActivityPageClient
      initial={{
        events: eventsRes.success && eventsRes.data ? eventsRes.data.items : [],
        pagination: eventsRes.success && eventsRes.data ? eventsRes.data.pagination : null,
        stats: statsRes.success && statsRes.data ? statsRes.data : null,
      }}
    />
  );
}
