import { Suspense } from "react";
import { getEventDetailsAction } from "@/lib/actions/event.actions";
import { EventDetailClient } from "@/components/dashboard/activity/event-detail-client";
import { DetailPageSkeleton } from "@/components/dashboard/page-skeletons";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <EventDetailPageData params={params} />
    </Suspense>
  );
}

async function EventDetailPageData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getEventDetailsAction(id);
  const initial = {
    event: res.success && res.data ? res.data : null,
    error: res.success && res.data ? null : res.error || "Event telemetry record not found",
  };
  return <EventDetailClient initial={initial} />;
}
