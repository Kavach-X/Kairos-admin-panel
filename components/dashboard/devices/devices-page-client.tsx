"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Plus,
  HardDrive,
  Store,
  Building2,
  MoreVertical,
  Truck,
  Eye,
  Trash2,
  Unlink,
  CheckCircle2,
  PowerOff,
  Wrench,
} from "lucide-react";
import type { Device, DeviceModel } from "@/lib/types";
import {
  deleteDeviceAction,
  decommissionDeviceAction,
  unassignDeviceAction,
  moveToMaintenanceAction,
  returnToStockAction,
} from "@/lib/actions/device.actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader, SearchBox, StatusTabs, countBy } from "@/components/dashboard/list-page";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TimeAgo } from "@/components/dashboard/overview/time-ago";
import dynamic from "next/dynamic";

// Dialogs are only needed after a click; load them off the critical path.
const FactoryRegisterModal = dynamic(() =>
  import("@/components/dashboard/devices/factory-register-modal").then((m) => m.FactoryRegisterModal)
);
const DispatchVendorModal = dynamic(() =>
  import("@/components/dashboard/devices/dispatch-vendor-modal").then((m) => m.DispatchVendorModal)
);
const ShipCustomerModal = dynamic(() =>
  import("@/components/dashboard/devices/ship-customer-modal").then((m) => m.ShipCustomerModal)
);
import { toast } from "sonner";

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: "All", value: "ALL" },
  { label: "In Stock", value: "IN_STOCK" },
  { label: "With Vendor", value: "WITH_VENDOR" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Installed", value: "INSTALLED" },
  { label: "Maintenance", value: "MAINTENANCE" },
  { label: "Returned", value: "RETURNED" },
  { label: "Decommissioned", value: "DECOMMISSIONED" },
];

const statusBadgeMap: Record<
  string,
  { label: string; className: string }
> = {
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

interface DevicesPageClientProps {
  devices: Device[];
  models: DeviceModel[];
  vendors: Array<{ id: string; name: string; vendorCode?: string }>;
}

export function DevicesPageClient({
  devices,
  models,
  vendors,
}: DevicesPageClientProps) {
  const [activeTab, setActiveTab] = React.useState("ALL");
  const [search, setSearch] = React.useState("");

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = React.useState(false);
  const [dispatchInitialDevice, setDispatchInitialDevice] = React.useState<Device | null>(null);
  const [shipDevice, setShipDevice] = React.useState<Device | null>(null);

  const router = useRouter();
  const deviceHref = (deviceId: string) => `/dashboard/devices/${encodeURIComponent(deviceId)}`;

  // Client-side instantaneous filtering: 0ms lag, zero network requests on
  // tab switch or search — `devices` is the full fleet fetched server-side.
  const filteredDevices = React.useMemo(() => {
    const q = search.toLowerCase();
    return devices.filter((d) => {
      if (activeTab !== "ALL" && d.inventory_status !== activeTab) return false;
      if (!q) return true;
      return (
        d.device_id.toLowerCase().includes(q) ||
        d.eth_mac.toLowerCase().includes(q) ||
        (d.wlan_mac && d.wlan_mac.toLowerCase().includes(q)) ||
        (d.soc_serial && d.soc_serial.toLowerCase().includes(q)) ||
        (d.storage_serial && d.storage_serial.toLowerCase().includes(q)) ||
        (d.model?.name && d.model.name.toLowerCase().includes(q)) ||
        (d.modelCode && d.modelCode.toLowerCase().includes(q)) ||
        (d.custodianAccount?.name && d.custodianAccount.name.toLowerCase().includes(q)) ||
        (d.ownerBusinessAccount?.name && d.ownerBusinessAccount.name.toLowerCase().includes(q))
      );
    });
  }, [devices, activeTab, search]);

  // Aggregate stats
  const totalFleet = devices.length;
  const inStockCount = devices.filter((d) => d.inventory_status === "IN_STOCK").length;
  const withVendorCount = devices.filter((d) => d.inventory_status === "WITH_VENDOR").length;
  const installedCount = devices.filter((d) => d.inventory_status === "INSTALLED").length;
  const installedOnline = devices.filter((d) => d.inventory_status === "INSTALLED" && d.online).length;
  const installedOffline = installedCount - installedOnline;
  const decommissionedCount = devices.filter((d) => d.inventory_status === "DECOMMISSIONED").length;
  const statusCounts = React.useMemo(() => countBy(devices, (d) => d.inventory_status), [devices]);

  const [confirmDialog, setConfirmDialog] = React.useState<{
    type: "DELETE" | "DECOMMISSION" | "UNASSIGN" | "MAINTENANCE" | "RESTOCK";
    device: Device | { device_id: string; ownerBusinessAccount?: { name: string } };
  } | null>(null);
  const [isActionPending, startActionTransition] = React.useTransition();

  function handleDelete(deviceId: string) {
    startActionTransition(async () => {
      const res = await deleteDeviceAction(deviceId);
      if (res.success) {
        toast.success(res.message || "Device deleted successfully");
        setConfirmDialog(null);
      } else {
        toast.error(res.error || "Failed to delete device");
      }
    });
  }

  function handleDecommission(deviceId: string) {
    startActionTransition(async () => {
      const res = await decommissionDeviceAction(deviceId, "Decommissioned after maintenance triage");
      if (res.success) {
        toast.success(`Device ${deviceId} has been decommissioned`);
        setConfirmDialog(null);
      } else {
        toast.error(res.error || "Failed to decommission device");
      }
    });
  }

  function handleMoveToMaintenance(deviceId: string) {
    startActionTransition(async () => {
      const res = await moveToMaintenanceAction(deviceId, "Moved to maintenance for diagnostics");
      if (res.success) {
        toast.success(`Device ${deviceId} moved to MAINTENANCE`);
        setConfirmDialog(null);
      } else {
        toast.error(res.error || "Failed to move device to maintenance");
      }
    });
  }

  function handleReturnToStock(deviceId: string) {
    startActionTransition(async () => {
      const res = await returnToStockAction(deviceId, "Returned to active warehouse stock after triage");
      if (res.success) {
        toast.success(`Device ${deviceId} returned to IN_STOCK`);
        setConfirmDialog(null);
      } else {
        toast.error(res.error || "Failed to return device to stock");
      }
    });
  }

  function handleUnassign(device: Device) {
    startActionTransition(async () => {
      const res = await unassignDeviceAction(device.device_id, {
        notes: "Unassigned from customer",
      });
      if (res.success) {
        toast.success(`Device ${device.device_id} unassigned successfully`);
        setConfirmDialog(null);
      } else {
        toast.error(res.error || "Failed to unassign device");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Hardware Devices"
        subtitle="Edge box fleet allocation, warehouse inventory, and customer store assignments"
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDispatchInitialDevice(null);
                setIsDispatchOpen(true);
              }}
              className="h-8 gap-1.5 text-xs font-normal"
            >
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
              Dispatch Stock
            </Button>
            <Button size="sm" onClick={() => setIsRegisterOpen(true)} className="h-8 gap-1.5 text-xs font-normal">
              <Plus className="h-3.5 w-3.5" />
              Add Device
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total fleet"
          value={String(totalFleet)}
          info="Every edge box registered in the system, wherever it is right now: in our warehouse, with a vendor, at a customer, or in repair."
          footer={<span className="text-[11px] text-muted-foreground">{decommissionedCount} decommissioned</span>}
        />
        <StatTile
          label="In stock"
          value={String(inStockCount)}
          info="Boxes sitting in our warehouse, tested and ready to send to a vendor or a customer."
          footer={<span className="text-[11px] text-muted-foreground">Ready to ship</span>}
        />
        <StatTile
          label="With vendors"
          value={String(withVendorCount)}
          info="Boxes handed to installation partners (vendors) who will fit them at customer sites."
          footer={<span className="text-[11px] text-muted-foreground">Partner stock</span>}
        />
        <StatTile
          label="Installed"
          value={String(installedCount)}
          info="Boxes running at customer sites. The line below shows how many of those are connected right now; an offline box cannot detect anything."
          footer={
            installedOffline > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-3" />
                {installedOnline} online · {installedOffline} offline
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />
                All {installedOnline} online
              </span>
            )
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <StatusTabs
          label="Device status"
          tabs={STATUS_TABS.map((t) => ({ ...t, count: t.value === "ALL" ? devices.length : (statusCounts[t.value] ?? 0) }))}
          active={activeTab}
          onChange={setActiveTab}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search ID, MAC, serial, model or customer..." />
      </div>

      {/* Devices Table */}
      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Device ID</th>
                <th className="px-4 py-2.5 font-medium">Model</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Online</th>
                <th className="px-4 py-2.5 font-medium">Managed By</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">MAC Address</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-foreground">
                      {search ? "No matching devices found" : "No devices found"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {search
                        ? "Try clearing or adjusting your search term."
                        : 'Click "Add Device" to register a device into stock.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => {
                  const statusConfig = statusBadgeMap[device.inventory_status] || {
                    label: device.inventory_status,
                    className: "",
                  };

                  return (
                    <tr
                      key={device.device_id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => router.push(deviceHref(device.device_id))}
                      onMouseEnter={() => router.prefetch(deviceHref(device.device_id))}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-foreground flex items-center gap-1.5">
                          {device.device_id}
                          {device.claim_code && (
                            <span
                              className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-sans font-medium"
                              title={`Claim Code: ${device.claim_code}`}
                            >
                              Code
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {device.model?.name || device.modelCode}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusConfig.className}>
                          {statusConfig.label}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${device.online ? "bg-emerald-500" : "bg-zinc-400"}`} />
                          <span className={device.online ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                            {device.online ? "Online" : "Offline"}
                          </span>
                          {!device.online && device.runtimeState?.last_seen_at && (
                            <TimeAgo iso={device.runtimeState.last_seen_at} className="text-[10px] text-muted-foreground/80" />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {device.inventory_status === "RETURNED" ||
                        device.inventory_status === "DECOMMISSIONED" ? (
                          <span className="text-muted-foreground italic">None (Warehouse)</span>
                        ) : device.custodianAccount?.name &&
                          device.custodianAccount.name !== "Kairos Internal Operations" ? (
                          <span className="font-medium text-foreground">
                            {device.custodianAccount.name}
                          </span>
                        ) : (
                          "Central Warehouse"
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {device.ownerBusinessAccount ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-primary shrink-0" />
                            <span className="font-medium text-foreground">
                              {device.ownerBusinessAccount.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">None</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {device.eth_mac}
                      </td>

                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                              />
                            }
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => router.push(deviceHref(device.device_id))}>
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              View Details
                            </DropdownMenuItem>

                            {(device.inventory_status === "IN_STOCK" ||
                              device.inventory_status === "RETURNED") && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDispatchInitialDevice(device);
                                    setIsDispatchOpen(true);
                                  }}
                                >
                                  <Store className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                  Send to Vendor
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShipDevice(device)}>
                                  <Truck className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                  Send to Customer
                                </DropdownMenuItem>
                              </>
                            )}

                            {(device.inventory_status === "ASSIGNED" ||
                              device.inventory_status === "INSTALLED") && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmDialog({ type: "UNASSIGN", device })
                                }
                              >
                                <Unlink className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                Unassign Customer
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* Move to Maintenance: Available unless already in Maintenance or Decommissioned */}
                            {device.inventory_status !== "MAINTENANCE" &&
                              device.inventory_status !== "DECOMMISSIONED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({ type: "MAINTENANCE", device })
                                  }
                                  className="text-amber-600 dark:text-amber-400"
                                >
                                  <Wrench className="mr-2 h-3.5 w-3.5" />
                                  Move to Maintenance
                                </DropdownMenuItem>
                              )}

                            {/* From Maintenance or Returned: Can return to stock */}
                            {(device.inventory_status === "MAINTENANCE" ||
                              device.inventory_status === "RETURNED") && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmDialog({ type: "RESTOCK", device })
                                }
                                className="text-emerald-600 dark:text-emerald-400"
                              >
                                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                Return to Stock (Ready)
                              </DropdownMenuItem>
                            )}

                            {/* From Maintenance: Can decommission */}
                            {device.inventory_status === "MAINTENANCE" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmDialog({ type: "DECOMMISSION", device })
                                }
                                className="text-rose-600 dark:text-rose-400"
                              >
                                <PowerOff className="mr-2 h-3.5 w-3.5" />
                                Decommission Unit
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                setConfirmDialog({ type: "DELETE", device })
                              }
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete Device
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <FactoryRegisterModal
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        models={models}
      />

      <DispatchVendorModal
        open={isDispatchOpen}
        onOpenChange={setIsDispatchOpen}
        initialDevice={dispatchInitialDevice}
        allDevices={devices}
        vendors={vendors}
      />

      <ShipCustomerModal
        open={Boolean(shipDevice)}
        onOpenChange={(open) => !open && setShipDevice(null)}
        device={shipDevice}
      />

      {/* Unified Confirmation Dialog */}
      <ConfirmModal
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        title={
          confirmDialog?.type === "DELETE"
            ? "Permanently Delete Device"
            : confirmDialog?.type === "DECOMMISSION"
            ? "Decommission Hardware Unit"
            : confirmDialog?.type === "MAINTENANCE"
            ? "Move Device to Maintenance"
            : confirmDialog?.type === "RESTOCK"
            ? "Return Device to In Stock"
            : "Unassign Customer Device"
        }
        description={
          confirmDialog?.type === "DELETE" ? (
            <span>
              Are you sure you want to permanently delete device{" "}
              <strong className="text-foreground font-mono">{confirmDialog.device.device_id}</strong>?
              <br />
              <span className="text-muted-foreground/80 mt-1 block">
                Note: Devices that have active RMA replacement or custody history cannot be purged and must be decommissioned instead.
              </span>
            </span>
          ) : confirmDialog?.type === "DECOMMISSION" ? (
            <span>
              Are you sure you want to decommission device{" "}
              <strong className="text-foreground font-mono">{confirmDialog.device.device_id}</strong>?
              <br />
              <span className="text-muted-foreground/80 mt-1 block">
                Technician diagnostics confirmed this unit cannot be repaired. This will permanently retire the unit and revoke all cloud certificates while preserving audit history.
              </span>
            </span>
          ) : confirmDialog?.type === "MAINTENANCE" ? (
            <span>
              Are you sure you want to move device{" "}
              <strong className="text-foreground font-mono">{confirmDialog.device.device_id}</strong> to{" "}
              <strong>MAINTENANCE</strong>?
              <br />
              <span className="text-muted-foreground/80 mt-1 block">
                The unit will be quarantined for hardware diagnostics, customer links detached, and RTSP streams stopped.
              </span>
            </span>
          ) : confirmDialog?.type === "RESTOCK" ? (
            <span>
              Mark device <strong className="text-foreground font-mono">{confirmDialog.device.device_id}</strong> as healthy and return to warehouse <strong>IN_STOCK</strong>?
              <br />
              <span className="text-muted-foreground/80 mt-1 block">
                The unit will be cleared for deployment and ready to be shipped or dispatched.
              </span>
            </span>
          ) : (
            <span>
              Unassign device{" "}
              <strong className="text-foreground font-mono">{confirmDialog?.device.device_id}</strong>
              {" from customer "}
              <strong className="text-foreground">
                {"ownerBusinessAccount" in (confirmDialog?.device || {})
                  ? (confirmDialog?.device as Device).ownerBusinessAccount?.name || "assigned customer"
                  : "assigned customer"}
              </strong>
              ? The unit will return directly to Central Warehouse intake in <strong>RETURNED</strong> status, customer association will be cleared, and all camera streams wiped clean.
            </span>
          )
        }
        confirmText={
          confirmDialog?.type === "DELETE"
            ? "Delete Device"
            : confirmDialog?.type === "DECOMMISSION"
            ? "Decommission Unit"
            : confirmDialog?.type === "MAINTENANCE"
            ? "Move to Maintenance"
            : confirmDialog?.type === "RESTOCK"
            ? "Return to Stock"
            : "Unassign Device"
        }
        variant={
          confirmDialog?.type === "DELETE" || confirmDialog?.type === "DECOMMISSION"
            ? "destructive"
            : confirmDialog?.type === "MAINTENANCE"
            ? "warning"
            : "default"
        }
        loading={isActionPending}
        onConfirm={() => {
          if (!confirmDialog) return;
          if (confirmDialog.type === "DELETE") {
            handleDelete(confirmDialog.device.device_id);
          } else if (confirmDialog.type === "DECOMMISSION") {
            handleDecommission(confirmDialog.device.device_id);
          } else if (confirmDialog.type === "MAINTENANCE") {
            handleMoveToMaintenance(confirmDialog.device.device_id);
          } else if (confirmDialog.type === "RESTOCK") {
            handleReturnToStock(confirmDialog.device.device_id);
          } else {
            handleUnassign(confirmDialog.device as Device);
          }
        }}
      />
    </div>
  );
}
