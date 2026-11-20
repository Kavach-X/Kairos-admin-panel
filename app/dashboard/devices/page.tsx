import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TablePageSkeleton } from "@/components/dashboard/page-skeletons";
import { getDevicesAction } from "@/lib/actions/device.actions";
import { getDeviceModels, getVendorsList } from "@/lib/data/reference-data";
import { DevicesPageClient } from "@/components/dashboard/devices/devices-page-client";

export default function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  return (
    <Suspense fallback={<TablePageSkeleton tabs={8} columns={7} />}>
      <DevicesData searchParams={searchParams} />
    </Suspense>
  );
}

async function DevicesData({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  // Old deep links (?selected=KBX-001) opened a side sheet; the device page replaces it.
  const { selected } = await searchParams;
  if (selected) redirect(`/dashboard/devices/${encodeURIComponent(selected)}`);

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
    />
  );
}
