import { Suspense } from "react";
import { getDeviceModels } from "@/lib/data/reference-data";
import { DeviceModelsPageClient } from "@/components/dashboard/devices/device-models-page-client";
import { ListPageSkeleton } from "@/components/dashboard/page-skeletons";

export default function DeviceModelsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <DeviceModelsPageData />
    </Suspense>
  );
}

async function DeviceModelsPageData() {
  const res = await getDeviceModels();
  return <DeviceModelsPageClient initialModels={res.success && res.data ? res.data : []} />;
}
