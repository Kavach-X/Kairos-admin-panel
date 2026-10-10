"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cpu,
  Building2,
  Trash2,
  ShieldCheck,
  HardDrive,
  PowerOff,
  Wrench,
  CheckCircle2,
  Video,
  VideoOff,
  ExternalLink,
  Cloud,
} from "lucide-react";
import type { Device } from "@/lib/types";
import { getDeviceByIdAction } from "@/lib/actions/device.actions";

interface DeviceDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
  onDelete?: (deviceId: string) => void;
  onDecommission?: (deviceId: string) => void;
  onMoveToMaintenance?: (deviceId: string) => void;
  onReturnToStock?: (deviceId: string) => void;
}

const statusBadgeStyles: Record<string, { label: string; className: string }> = {
  IN_STOCK: {
    label: "In Stock",
    className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  WITH_VENDOR: {
    label: "With Vendor",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  ASSIGNED: {
    label: "Assigned",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  INSTALLED: {
    label: "Installed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  MAINTENANCE: {
    label: "Maintenance",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  RETURNED: {
    label: "Returned",
    className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  DECOMMISSIONED: {
    label: "Decommissioned",
    className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  },
};

export function DeviceDetailsSheet({
  open,
  onOpenChange,
  device,
  onDelete,
  onDecommission,
  onMoveToMaintenance,
  onReturnToStock,
}: DeviceDetailsSheetProps) {
  const [deviceDetails, setDeviceDetails] = React.useState<Device | null>(device);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const sheetContentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setDeviceDetails(device);
    if (open) {
      if (sheetContentRef.current) {
        sheetContentRef.current.scrollTop = 0;
      }
    }
    if (open && device?.device_id) {
      setLoadingDetails(true);
      getDeviceByIdAction(device.device_id)
        .then((res) => {
          if (res.success && res.data) {
            setDeviceDetails(res.data);
          }
        })
        .finally(() => setLoadingDetails(false));
    }
  }, [open, device?.device_id]);

  if (!device) return null;

  const currentDevice = deviceDetails || device;
  const cameras = currentDevice.cameras || [];

  const statusConfig = statusBadgeStyles[currentDevice.inventory_status] || {
    label: currentDevice.inventory_status,
    className: "",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetContentRef}
        side="right"
        className="sm:max-w-md overflow-y-auto"
      >
        <SheetHeader className="p-6 pr-14 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  currentDevice.online ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                }`}
              />
              {currentDevice.online ? "Online" : "Offline"}
            </div>
            {loadingDetails ? (
              <Badge
                variant="outline"
                className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-medium ml-auto flex items-center gap-1"
              >
                <Cloud className="h-3 w-3" />
                Pending Cloud
              </Badge>
            ) : !currentDevice.online ? (
              <Badge
                variant="outline"
                className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30 text-[10px] font-medium ml-auto flex items-center gap-1"
              >
                <Cloud className="h-3 w-3" />
                Pending Cloud Sync
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-medium ml-auto flex items-center gap-1"
              >
                <Cloud className="h-3 w-3" />
                Cloud Connected
              </Badge>
            )}
          </div>
          <SheetTitle className="text-xl font-bold font-mono tracking-tight text-foreground mt-2">
            {currentDevice.device_id}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Model: <strong className="text-foreground">{currentDevice.model?.name || currentDevice.modelCode}</strong>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-6 text-xs">
          {/* Hardware Info */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Hardware Info
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3 font-mono text-[11px]">
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Ethernet MAC</span>
                <span className="text-foreground">{currentDevice.eth_mac}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">WLAN MAC</span>
                <span className="text-foreground">{currentDevice.wlan_mac || "None"}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">CPU Serial</span>
                <span className="text-foreground truncate block" title={currentDevice.soc_serial || "N/A"}>
                  {currentDevice.soc_serial || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Machine</span>
                <span className="text-foreground">{currentDevice.machine || "ARM64"}</span>
              </div>
            </div>
          </div>

          {/* Location & Customer */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Location & Customer
            </span>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
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
            </div>
          </div>

          {/* Connected CCTV Cameras & RTSP Channels */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-primary" />
                CCTV Cameras & Channels ({cameras.length})
              </span>
            </div>

            {cameras.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {cameras.map((cam) => {
                  const isOnline = cam.status === "ACTIVE";
                  return (
                    <div
                      key={cam.id}
                      className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
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
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                              isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                            }`}
                          />
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
              <div className="rounded-lg border border-dashed border-border bg-card/40 p-4 text-center flex flex-col items-center justify-center">
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
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Cloud Status
            </span>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Cloud Sync:</span>
                {loadingDetails ? (
                  <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-medium flex items-center gap-1">
                    <Cloud className="h-3 w-3" />
                    Pending Cloud
                  </Badge>
                ) : currentDevice.online ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Connected & Synchronized
                  </span>
                ) : (
                  <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30 text-[10px] font-medium flex items-center gap-1">
                    <Cloud className="h-3 w-3" />
                    Pending Cloud (Offline)
                  </Badge>
                )}
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">First Activated:</span>
                <span className="text-foreground">
                  {currentDevice.activated_at ? new Date(currentDevice.activated_at).toLocaleString() : "Never"}
                </span>
              </div>
              {currentDevice.claim_code && (
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground font-semibold text-primary">Claim Code:</span>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30">
                    {currentDevice.claim_code}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Model Specs */}
          {currentDevice.model?.specs && (
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-primary" />
                Model Specs
              </span>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3">
                {Object.entries(currentDevice.model.specs).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-[10px] text-muted-foreground uppercase">{key}</span>
                    <span className="text-foreground font-medium block">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-border/40 flex flex-col gap-2">
            {/* 1. Maintenance Transition */}
            {currentDevice.inventory_status !== "MAINTENANCE" &&
              currentDevice.inventory_status !== "DECOMMISSIONED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => {
                    onMoveToMaintenance?.(currentDevice.device_id);
                    onOpenChange(false);
                  }}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Move to Maintenance
                </Button>
              )}

            {/* 2. Return to Stock from Maintenance or Returned */}
            {(currentDevice.inventory_status === "MAINTENANCE" ||
              currentDevice.inventory_status === "RETURNED") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => {
                  onReturnToStock?.(currentDevice.device_id);
                  onOpenChange(false);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Return to Stock (Ready)
              </Button>
            )}

            {/* 3. Decommission Device: Only allowed when in MAINTENANCE */}
            {currentDevice.inventory_status === "MAINTENANCE" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                onClick={() => {
                  onDecommission?.(currentDevice.device_id);
                  onOpenChange(false);
                }}
              >
                <PowerOff className="h-3.5 w-3.5" />
                Decommission Device
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              className="gap-2 w-full"
              onClick={() => {
                onDelete?.(currentDevice.device_id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Device
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
