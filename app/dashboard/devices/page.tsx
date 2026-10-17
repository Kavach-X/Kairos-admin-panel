import {
  getDevicesAction,
  getDeviceModelsAction,
  getVendorsListAction,
} from "@/lib/actions/device.actions";
import { DevicesPageClient } from "@/components/dashboard/devices/devices-page-client";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const { selected } = await searchParams;

  const [devRes, modelRes, vendorRes] = await Promise.all([
    getDevicesAction({ limit: 250 }),
    getDeviceModelsAction(),
    getVendorsListAction(),
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
