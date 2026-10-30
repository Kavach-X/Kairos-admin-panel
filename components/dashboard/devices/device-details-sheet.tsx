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
  Activity,
  Building2,
  Trash2,
  ShieldCheck,
  PowerOff,
  Wrench,
  CheckCircle2,
  ExternalLink,
  Cloud,
} from "lucide-react";
import type { Device } from "@/lib/types";
import { statusBadgeStyles } from "./device-status";
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

          {/* Health Summary — full telemetry lives on the device page */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Health
            </span>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-foreground">
                  {currentDevice.runtimeState?.operational_status ||
                    currentDevice.operational_status ||
                    (currentDevice.online ? "ONLINE" : "OFFLINE")}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Last Seen:</span>
                <span className="text-foreground">
                  {currentDevice.runtimeState?.last_seen_at
                    ? new Date(currentDevice.runtimeState.last_seen_at).toLocaleString()
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cameras:</span>
                <span className="text-foreground">{cameras.length}</span>
              </div>
              <Link
                href={`/dashboard/devices/${encodeURIComponent(currentDevice.device_id)}`}
                className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-primary/30 py-1.5 font-medium text-primary hover:bg-primary/10"
              >
                View full details, telemetry & live data
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

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
