import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Clock, Cpu, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDeviceByIdAction } from "@/lib/actions/device.actions";
import { DeviceDetailSkeleton } from "@/components/dashboard/page-skeletons";
import { DeviceEventsSummary } from "@/components/dashboard/devices/device-events-summary";
import { DeviceTelemetryPanel } from "@/components/dashboard/devices/device-telemetry-panel";
import { DeviceTunnelPanel } from "@/components/dashboard/devices/device-tunnel-panel";
import { DeviceDetailTabs } from "@/components/dashboard/devices/device-detail-tabs";
import { LastSeen } from "@/components/dashboard/devices/relative-time";
import { statusBadgeStyles } from "@/components/dashboard/devices/device-status";
import { modelSpecRows } from "@/components/dashboard/devices/model-specs";
import { CameraRow } from "@/components/dashboard/customers/customer-detail-client";
import { EmptyTableRow } from "@/components/dashboard/list-page";
import { CardShell } from "@/components/dashboard/analytics/viz";
import { DetailHeader, Facts, SURFACE, TH, THEAD } from "@/components/dashboard/detail-header";

const DATE = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

export default function DeviceDetailPage({ params }: { params: Promise<{ deviceId: string }> }) {
  return (
    <Suspense fallback={<DeviceDetailSkeleton />}>
      <DeviceDetail params={params} />
    </Suspense>
  );
}

async function DeviceDetail({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params;
  const res = await getDeviceByIdAction(deviceId);
  if (!res.success || !res.data) notFound();

  const device = res.data;
  const cameras = device.cameras || [];
  const status = statusBadgeStyles[device.inventory_status] ?? { label: device.inventory_status, className: "" };
  const lastSeenAt = device.runtimeState?.last_seen_at ?? null;
  const customer = device.ownerBusinessAccount;
  const customerHref = device.businessAccountId ? `/dashboard/customers/${device.businessAccountId}` : null;
  const custodian =
    device.custodianAccount?.name && device.custodianAccount.name !== "Kairos Internal Operations"
      ? device.custodianAccount.name
      : "Central warehouse";

  return (
    <div className="flex flex-col gap-5">
      <DetailHeader
        back={{ href: "/dashboard/devices", label: "Devices" }}
        title={device.device_id}
        mono
        badges={
          <>
            <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${status.className}`}>
              {status.label}
            </Badge>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`size-1.5 rounded-full ${device.online ? "bg-emerald-500" : "bg-zinc-400"}`} />
              {device.online ? "Online" : "Offline"}
            </span>
          </>
        }
        meta={[
          <>
            <Cpu className="size-3" />
            {device.model?.name || device.modelCode}
          </>,
          customer?.name && (
            <>
              <Building2 className="size-3" />
              {customerHref ? (
                <Link href={customerHref} className="hover:text-foreground hover:underline">
                  {customer.name}
                </Link>
              ) : (
                customer.name
              )}
            </>
          ),
          <>
            <Video className="size-3" />
            {cameras.length} {cameras.length === 1 ? "camera" : "cameras"}
          </>,
          !device.online && (
            <>
              <Clock className="size-3" />
              <span>
                Last seen <LastSeen deviceId={device.device_id} iso={lastSeenAt} />
              </span>
            </>
          ),
        ]}
      />

      <DeviceDetailTabs
        cameraCount={cameras.length}
        health={
          <DeviceTelemetryPanel
            deviceId={device.device_id}
            online={Boolean(device.online)}
            inventoryStatus={device.inventory_status}
            lastSeenAt={lastSeenAt}
            cameras={cameras.map((c) => ({ id: c.id, name: c.name, channelNumber: c.channelNumber ?? null }))}
          />
        }
        events={<DeviceEventsSummary deviceId={device.device_id} />}
        cameras={
          <div className={`${SURFACE} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={THEAD}>
                  <tr>
                    <th className={TH}>Camera</th>
                    <th className={TH}>Address</th>
                    <th className={TH}>Stream</th>
                    <th className={TH}>Detects</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {cameras.length === 0 ? (
                    <EmptyTableRow colSpan={5} icon={Video} title="No cameras yet" hint="Cameras appear here once they are added at the customer's site." />
                  ) : (
                    cameras.map((cam) => <CameraRow key={cam.id} cam={cam} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        }
        hardware={
          <>
            <DeviceTunnelPanel key={device.device_id} deviceId={device.device_id} inventoryStatus={device.inventory_status} />
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <CardShell title="Installation">
                <Facts
                  items={[
                    {
                      label: "Customer",
                      value:
                        customer?.name &&
                        (customerHref ? (
                          <Link href={customerHref} className="hover:text-primary hover:underline">
                            {customer.name}
                          </Link>
                        ) : (
                          customer.name
                        )),
                    },
                    { label: "Held by", value: custodian },
                    { label: "Installed by", value: device.installedByVendor?.name || "Direct" },
                    { label: "Address", value: device.installation_address },
                    { label: "First activated", value: device.activated_at ? DATE.format(new Date(device.activated_at)) : "Never" },
                  ]}
                />
                {device.installation_notes && (
                  <p className="mt-3 whitespace-pre-wrap border-t border-border/40 pt-3 text-xs text-muted-foreground">{device.installation_notes}</p>
                )}
              </CardShell>

              <CardShell title="Identifiers">
                <Facts
                  items={[
                    { label: "Ethernet MAC", value: device.eth_mac, mono: true },
                    { label: "Wi-Fi MAC", value: device.wlan_mac, mono: true },
                    { label: "Bluetooth MAC", value: device.ble_mac, mono: true },
                    { label: "CPU serial", value: device.soc_serial, mono: true },
                    { label: "SoC ID", value: device.soc_id, mono: true },
                    { label: "Storage serial", value: device.storage_serial, mono: true },
                    { label: "Machine", value: device.machine, mono: true },
                  ]}
                />
              </CardShell>

              {device.model && modelSpecRows(device.model.specs).length > 0 && (
                <CardShell title={`Model · ${device.model.name}`}>
                  <Facts items={modelSpecRows(device.model.specs)} />
                </CardShell>
              )}
            </div>
          </>
        }
      />
    </div>
  );
}
