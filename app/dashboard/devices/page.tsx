"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
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
  X,
  PowerOff,
  Wrench,
} from "lucide-react";
import type { Device, DeviceModel } from "@/lib/types";
import {
  getDevicesAction,
  getDeviceModelsAction,
  getVendorsListAction,
  deleteDeviceAction,
  decommissionDeviceAction,
  unassignDeviceAction,
  moveToMaintenanceAction,
  returnToStockAction,
} from "@/lib/actions/device.actions";
import { FactoryRegisterModal } from "@/components/dashboard/devices/factory-register-modal";
import { DispatchVendorModal } from "@/components/dashboard/devices/dispatch-vendor-modal";
import { ShipCustomerModal } from "@/components/dashboard/devices/ship-customer-modal";
import { DeviceDetailsSheet } from "@/components/dashboard/devices/device-details-sheet";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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

function DevicesPageContent() {
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("selected");

  const [devices, setDevices] = React.useState<Device[]>([]);
  const [models, setModels] = React.useState<DeviceModel[]>([]);
  const [vendors, setVendors] = React.useState<
    Array<{ id: string; name: string; vendorCode?: string }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("ALL");
  const [search, setSearch] = React.useState("");

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = React.useState(false);
  const [dispatchInitialDevice, setDispatchInitialDevice] = React.useState<Device | null>(null);
  const [shipDevice, setShipDevice] = React.useState<Device | null>(null);
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);

  // Auto-open device from URL query param (?selected=KBX-001-TEST)
  React.useEffect(() => {
    if (selectedParam && devices.length > 0) {
      const match = devices.find(
        (d) => d.device_id.toLowerCase() === selectedParam.toLowerCase()
      );
      if (match) {
        setSelectedDevice(match);
      }
    }
  }, [selectedParam, devices]);

  // Fetch fleet on mount and when status tab changes (search does NOT hit the network)
  const fetchFleet = React.useCallback(async () => {
    setLoading(true);
    const [devRes, modelRes, vendorRes] = await Promise.all([
      getDevicesAction({
        inventory_status: activeTab !== "ALL" ? activeTab : undefined,
        limit: 250,
      }),
      getDeviceModelsAction(),
      getVendorsListAction(),
    ]);

    if (devRes.success && devRes.data) {
      setDevices(devRes.data.items);
    } else if (!devRes.success) {
      toast.error(devRes.error || "Failed to load devices");
    }
    if (modelRes.success && modelRes.data) {
      setModels(modelRes.data);
    }
    if (vendorRes.success && vendorRes.data) {
      setVendors(vendorRes.data);
    }
    setLoading(false);
  }, [activeTab]);

  React.useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  // Client-side instantaneous filtering: 0ms lag, zero network requests on search
  const filteredDevices = React.useMemo(() => {
    if (!search.trim()) return devices;
    const q = search.toLowerCase();
    return devices.filter((d) => {
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
  }, [devices, search]);

  // Aggregate stats
  const totalFleet = devices.length;
  const inStockCount = devices.filter((d) => d.inventory_status === "IN_STOCK").length;
  const withVendorCount = devices.filter((d) => d.inventory_status === "WITH_VENDOR").length;
  const installedCount = devices.filter((d) => d.inventory_status === "INSTALLED").length;

  const [confirmDialog, setConfirmDialog] = React.useState<{
    type: "DELETE" | "DECOMMISSION" | "UNASSIGN" | "MAINTENANCE" | "RESTOCK";
    device: Device | { device_id: string; ownerBusinessAccount?: { name: string } };
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  async function handleDelete(deviceId: string) {
    setActionLoading(true);
    try {
      const res = await deleteDeviceAction(deviceId);
      if (res.success) {
        toast.success(res.message || "Device deleted successfully");
        setConfirmDialog(null);
        fetchFleet();
      } else {
        toast.error(res.error || "Failed to delete device");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecommission(deviceId: string) {
    setActionLoading(true);
    try {
      const res = await decommissionDeviceAction(deviceId, "Decommissioned after maintenance triage");
      if (res.success) {
        toast.success(`Device ${deviceId} has been decommissioned`);
        setConfirmDialog(null);
        fetchFleet();
      } else {
        toast.error(res.error || "Failed to decommission device");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMoveToMaintenance(deviceId: string) {
    setActionLoading(true);
    try {
      const res = await moveToMaintenanceAction(deviceId, "Moved to maintenance for diagnostics");
      if (res.success) {
        toast.success(`Device ${deviceId} moved to MAINTENANCE`);
        setConfirmDialog(null);
        fetchFleet();
      } else {
        toast.error(res.error || "Failed to move device to maintenance");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReturnToStock(deviceId: string) {
    setActionLoading(true);
    try {
      const res = await returnToStockAction(deviceId, "Returned to active warehouse stock after triage");
      if (res.success) {
        toast.success(`Device ${deviceId} returned to IN_STOCK`);
        setConfirmDialog(null);
        fetchFleet();
      } else {
        toast.error(res.error || "Failed to return device to stock");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnassign(device: Device) {
    setActionLoading(true);
    try {
      const res = await unassignDeviceAction(device.device_id, {
        notes: "Unassigned from customer",
      });
      if (res.success) {
        toast.success(`Device ${device.device_id} unassigned successfully`);
        setConfirmDialog(null);
        fetchFleet();
      } else {
        toast.error(res.error || "Failed to unassign device");
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Hardware Devices
          </h1>
          <p className="text-xs text-muted-foreground">
            Edge box fleet allocation, warehouse inventory, and customer store assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDispatchInitialDevice(null);
              setIsDispatchOpen(true);
            }}
            className="h-8 text-xs font-normal gap-1.5"
          >
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            Dispatch Stock
          </Button>
          <Button
            size="sm"
            onClick={() => setIsRegisterOpen(true)}
            className="h-8 text-xs font-normal gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Device
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Fleet
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                registered
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalFleet}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                hardware boxes
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                In Stock
              </span>
              <span className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400">
                warehouse
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {inStockCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                ready to ship
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                With Vendor
              </span>
              <span className="font-mono text-[11px] font-medium text-amber-600 dark:text-amber-400">
                partner stock
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {withVendorCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                field custody
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Installed
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                at stores
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {installedCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                live surveillance
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/40 rounded-md border border-border/50">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === tab.value
                  ? "bg-card text-foreground shadow-none border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search ID, MAC, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 text-xs h-8 border-border/50 bg-card shadow-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="overflow-hidden border border-border/50 bg-card shadow-none">
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredDevices.length === 0 ? (
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
                      onClick={() => setSelectedDevice(device)}
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
                          <span
                            className={`h-2 w-2 rounded-full ${
                              device.online
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-zinc-400"
                            }`}
                          />
                          <span
                            className={
                              device.online
                                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {device.online ? "Online" : "Offline"}
                          </span>
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
                            <DropdownMenuItem onClick={() => setSelectedDevice(device)}>
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

      {/* Modals & Sheets */}
      <FactoryRegisterModal
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        models={models}
        onSuccess={fetchFleet}
      />

      <DispatchVendorModal
        open={isDispatchOpen}
        onOpenChange={setIsDispatchOpen}
        initialDevice={dispatchInitialDevice}
        allDevices={devices}
        vendors={vendors}
        onSuccess={fetchFleet}
      />

      <ShipCustomerModal
        open={Boolean(shipDevice)}
        onOpenChange={(open) => !open && setShipDevice(null)}
        device={shipDevice}
        onSuccess={fetchFleet}
      />

      <DeviceDetailsSheet
        open={Boolean(selectedDevice)}
        onOpenChange={(open) => !open && setSelectedDevice(null)}
        device={selectedDevice}
        onDelete={(id) => setConfirmDialog({ type: "DELETE", device: { device_id: id } })}
        onDecommission={(id) => setConfirmDialog({ type: "DECOMMISSION", device: { device_id: id } })}
        onMoveToMaintenance={(id) => setConfirmDialog({ type: "MAINTENANCE", device: { device_id: id } })}
        onReturnToStock={(id) => setConfirmDialog({ type: "RESTOCK", device: { device_id: id } })}
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
        loading={actionLoading}
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

export default function DevicesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <DevicesPageContent />
    </React.Suspense>
  );
}
