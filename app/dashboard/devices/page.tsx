import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/page-skeletons";
import { getDevicesAction } from "@/lib/actions/device.actions";
import { getDeviceModels, getVendorsList } from "@/lib/data/reference-data";
import { DevicesPageClient } from "@/components/dashboard/devices/devices-page-client";

export default function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <DevicesData searchParams={searchParams} />
    </Suspense>
  );
}

async function DevicesData({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const { selected } = await searchParams;

  const [devRes, modelRes, vendorRes] = await Promise.all([
    getDevicesAction({ limit: 250 }),
    getDeviceModels(),
    getVendorsList(),
  ]);

  const devices = devRes.success && devRes.data ? devRes.data.items : [];
  const models = modelRes.success && modelRes.data ? modelRes.data : [];
  const vendors = vendorRes.success && vendorRes.data ? vendorRes.data : [];

  return (
    <DevicesPageClient
      devices={devices}
      models={models}
      vendors={vendors}
      initialSelectedDeviceId={selected}
    />
  );
}
