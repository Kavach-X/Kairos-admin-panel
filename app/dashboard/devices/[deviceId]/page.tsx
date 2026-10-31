import { Suspense } from "react";
import { DetailPageSkeleton } from "@/components/dashboard/page-skeletons";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Cpu,
  Building2,
  ShieldCheck,
  HardDrive,
  Video,
  VideoOff,
  ExternalLink,
  Cloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDeviceByIdAction } from "@/lib/actions/device.actions";
import { DeviceTelemetryPanel } from "@/components/dashboard/devices/device-telemetry-panel";
import { LastSeen } from "@/components/dashboard/devices/relative-time";
import { SectionTitle } from "@/components/dashboard/devices/section";
import { statusBadgeStyles } from "@/components/dashboard/devices/device-status";

export default function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <DeviceDetail params={params} />
    </Suspense>
  );
}

async function DeviceDetail({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params;
  const res = await getDeviceByIdAction(deviceId);
  if (!res.success || !res.data) notFound();

  const currentDevice = res.data;
  const cameras = currentDevice.cameras || [];
  const statusConfig = statusBadgeStyles[currentDevice.inventory_status] || {
    label: currentDevice.inventory_status,
    className: "",
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 text-xs">
      <Link
        href="/dashboard/devices"
        className="flex w-fit items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to devices
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                currentDevice.online ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            {currentDevice.online ? "Online" : "Offline"}
          </div>
        </div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
          {currentDevice.device_id}
        </h1>
        <p className="text-xs text-muted-foreground">
          Model:{" "}
          <strong className="text-foreground">
            {currentDevice.model?.name || currentDevice.modelCode}
          </strong>
        </p>
      </div>

      <DeviceTelemetryPanel
        deviceId={currentDevice.device_id}
        online={Boolean(currentDevice.online)}
        inventoryStatus={currentDevice.inventory_status}
        lastSeenAt={currentDevice.runtimeState?.last_seen_at ?? null}
      />

      <div className="grid gap-x-4 gap-y-6 border-t border-border/60 pt-6 lg:grid-cols-2">
          {/* Hardware Info */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon={Cpu}>Hardware Info</SectionTitle>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-4 font-mono text-xs">
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">Ethernet MAC</span>
                <span className="text-foreground">{currentDevice.eth_mac}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">WLAN MAC</span>
                <span className="text-foreground">{currentDevice.wlan_mac || "None"}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">Bluetooth MAC</span>
                <span className="text-foreground">{currentDevice.ble_mac || "None"}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">CPU Serial</span>
                <span className="text-foreground truncate block" title={currentDevice.soc_serial || "N/A"}>
                  {currentDevice.soc_serial || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">SoC ID</span>
                <span className="text-foreground truncate block" title={currentDevice.soc_id || "N/A"}>
                  {currentDevice.soc_id || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">Storage Serial</span>
                <span className="text-foreground truncate block" title={currentDevice.storage_serial || "N/A"}>
                  {currentDevice.storage_serial || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-sans">Machine</span>
                <span className="text-foreground">{currentDevice.machine || "ARM64"}</span>
              </div>
            </div>
          </div>


          {/* Location & Customer */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon={Building2}>Location & Customer</SectionTitle>
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Managed By:</span>
                <span className="font-medium text-foreground">
                  {currentDevice.custodianAccount?.name &&
                  currentDevice.custodianAccount.name !== "Kairos Internal Operations"
                    ? currentDevice.custodianAccount.name
                    : "Central Warehouse"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Customer:</span>
                {currentDevice.businessAccountId && currentDevice.ownerBusinessAccount?.name ? (
                  <Link
                    href={`/dashboard/customers/${currentDevice.businessAccountId}`}
                    className="font-medium text-primary hover:underline flex items-center gap-1 group"
                  >
                    <span>{currentDevice.ownerBusinessAccount.name}</span>
                    <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">
                    {currentDevice.ownerBusinessAccount?.name || "None"}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-medium text-foreground">
                  {currentDevice.installedByVendor?.name || "None (Direct)"}
                </span>
              </div>
              {currentDevice.installation_address && (
                <div className="flex justify-between items-start pt-2 border-t border-border/40 gap-3">
                  <span className="text-muted-foreground shrink-0">Install Address:</span>
                  <span className="font-medium text-foreground text-right">
                    {currentDevice.installation_address}
                  </span>
                </div>
              )}
              {currentDevice.installation_notes && (
                <div className="flex flex-col gap-1 pt-2 border-t border-border/40">
                  <span className="text-muted-foreground">Install Notes:</span>
                  <span className="font-medium text-foreground whitespace-pre-wrap">
                    {currentDevice.installation_notes}
                  </span>
                </div>
              )}
            </div>
          </div>


          {/* Connected CCTV Cameras & RTSP Channels */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Video}>CCTV Cameras & Channels ({cameras.length})</SectionTitle>
            </div>

            {cameras.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {cameras.map((cam) => {
                  const isOnline = cam.status === "ACTIVE";
                  return (
                    <div
                      key={cam.id}
                      className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] font-bold px-1.5 py-0 border-primary/30 text-primary"
                          >
                            CH {cam.channelNumber}
                          </Badge>
                          <span className="font-semibold text-foreground text-xs">
                            {cam.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            isOnline
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px]"
                          }
                        >
                          {cam.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
                        <div>
                          <span className="text-[10px] block font-sans text-muted-foreground">IP & Port</span>
                          <span className="text-foreground">{cam.ipAddress}:{cam.port}</span>
                        </div>
                        <div>
                          <span className="text-[10px] block font-sans text-muted-foreground">Profile</span>
                          <span className="text-foreground">{cam.resolution || "1080p"} @ {cam.fpsLimit || 15}fps</span>
                        </div>
                      </div>

                      {cam.rtspPath && (
                        <div className="text-[10px] font-mono bg-muted/40 px-2 py-1 rounded truncate text-muted-foreground">
                          <span className="text-foreground/70">Path:</span> {cam.rtspPath}
                        </div>
                      )}

                      {cam.aiTasks && cam.aiTasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {cam.aiTasks.map((task) => (
                            <Badge
                              key={task}
                              variant="secondary"
                              className="text-[9px] font-mono px-1.5 py-0 uppercase"
                            >
                              {task}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center flex flex-col items-center justify-center">
                <VideoOff className="h-5 w-5 text-muted-foreground/40 mb-1" />
                <span className="text-xs font-medium text-foreground">
                  No Cameras Configured
                </span>
                <p className="text-[11px] text-muted-foreground max-w-[240px] mt-0.5">
                  IP/RTSP camera channels attach when onboarded at customer store.
                </p>
              </div>
            )}
          </div>


          {/* Cloud Status */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon={ShieldCheck}>Cloud Status</SectionTitle>
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Connection:</span>
                {currentDevice.online ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    Connected to the cloud
                  </span>
                ) : (
                  <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30 text-[10px] font-medium flex items-center gap-1">
                    <Cloud className="h-3 w-3" />
                    Offline
                  </Badge>
                )}
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Last Seen:</span>
                <span className="text-foreground">
                  <LastSeen
                    deviceId={currentDevice.device_id}
                    iso={currentDevice.runtimeState?.last_seen_at ?? null}
                  />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">First Activated:</span>
                <span className="text-foreground">
                  {currentDevice.activated_at ? new Date(currentDevice.activated_at).toLocaleString() : "Never"}
                </span>
              </div>
            </div>
          </div>

          {/* Model Specs */}
          {currentDevice.model?.specs && (
            <div className="flex flex-col gap-3">
              <SectionTitle icon={HardDrive}>Model Specs</SectionTitle>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-4">
                {Object.entries(currentDevice.model.specs).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-[11px] text-muted-foreground uppercase">{key}</span>
                    <span className="text-foreground font-medium block">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

      </div>
    </div>
  );
}
