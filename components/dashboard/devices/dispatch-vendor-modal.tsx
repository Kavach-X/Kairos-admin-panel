"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import {
  Store,
  RefreshCw,
  AlertCircle,
  Search,
  Plus,
  X,
  HardDrive,
  Package,
} from "lucide-react";
import type { Device } from "@/lib/types";
import { dispatchToVendorAction, getVendorsListAction } from "@/lib/actions/device.actions";

interface DispatchVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDevice?: Device | null;
  allDevices?: Device[];
  vendors?: Array<{ id: string; name: string; vendorCode?: string }>;
  onSuccess?: () => void;
}

export function DispatchVendorModal({
  open,
  onOpenChange,
  initialDevice = null,
  allDevices = [],
  vendors = [],
  onSuccess,
}: DispatchVendorModalProps) {
  const [vendorAccountId, setVendorAccountId] = React.useState("");
  const [selectedVendor, setSelectedVendor] = React.useState<SearchableOption | null>(null);
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [transferReason, setTransferReason] = React.useState("");
  const [selectedDevices, setSelectedDevices] = React.useState<Device[]>([]);
  const [deviceSearch, setDeviceSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setVendorAccountId("");
      setSelectedVendor(null);
      setTrackingNumber("");
      setTransferReason("");
      setError(null);
      setDeviceSearch("");
      if (initialDevice) {
        setSelectedDevices([initialDevice]);
      } else {
        setSelectedDevices([]);
      }
    }
  }, [open, initialDevice]);

  // Backend search triggered only on user keystroke for vendors
  const handleSearchVendors = React.useCallback(async (query: string): Promise<SearchableOption[]> => {
    const res = await getVendorsListAction(query);
    if (res.success && res.data) {
      return res.data.map((v) => ({
        value: v.id,
        label: v.name,
        subLabel: v.vendorCode ? `Code: ${v.vendorCode}` : undefined,
      }));
    }
    return [];
  }, []);

  // Devices eligible for dispatch: IN_STOCK or RETURNED, and not already selected
  const eligibleDevices = React.useMemo(() => {
    const selectedIds = new Set(selectedDevices.map((d) => d.device_id));
    return allDevices.filter(
      (d) =>
        (d.inventory_status === "IN_STOCK" || d.inventory_status === "RETURNED") &&
        !selectedIds.has(d.device_id)
    );
  }, [allDevices, selectedDevices]);

  // As-you-type search matches: empty if no search term typed
  const searchResults = React.useMemo(() => {
    if (!deviceSearch.trim()) return [];
    const q = deviceSearch.toLowerCase().trim();
    return eligibleDevices.filter(
      (d) =>
        d.device_id.toLowerCase().includes(q) ||
        d.eth_mac.toLowerCase().includes(q) ||
        (d.model?.name && d.model.name.toLowerCase().includes(q)) ||
        (d.modelCode && d.modelCode.toLowerCase().includes(q))
    );
  }, [eligibleDevices, deviceSearch]);

  function handleAddDevice(device: Device) {
    setSelectedDevices((prev) => [...prev, device]);
    setDeviceSearch("");
    setError(null);
  }

  function handleRemoveDevice(deviceId: string) {
    setSelectedDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!vendorAccountId) {
      setError("Please select a target vendor partner");
      return;
    }

    if (selectedDevices.length === 0) {
      setError("Please add at least one device to dispatch");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await dispatchToVendorAction({
      vendorAccountId,
      deviceIds: selectedDevices.map((d) => d.device_id),
      tracking_number: trackingNumber.trim() || undefined,
      transfer_reason: transferReason.trim() || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to dispatch devices to vendor");
    } else {
      onSuccess?.();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-visible">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Dispatch Stock to Vendor</DialogTitle>
              <DialogDescription>
                Transfer warehouse hardware stock to an authorized vendor partner.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Target Vendor Selection (Backend keystroke-driven search) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              Select Vendor Partner <span className="text-destructive">*</span>
            </label>
            <SearchableSelect
              value={vendorAccountId}
              selectedOption={selectedVendor}
              onValueChange={(val, opt) => {
                setVendorAccountId(val);
                setSelectedVendor(opt || null);
                setError(null);
              }}
              onSearch={handleSearchVendors}
              placeholder="Search or select vendor partner..."
              searchPlaceholder="Type vendor name or code..."
              searchPromptText="Type vendor name or code to search..."
              noResultsText="No matching vendor found"
            />
          </div>

          {/* 2. Device Batch Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Devices to Dispatch ({selectedDevices.length}) <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                {eligibleDevices.length} available in warehouse
              </span>
            </div>

            {/* As-You-Type Search Bar with Browser Auto-Suggest Disabled */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search device by ID, MAC, or Model to add..."
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  className="pl-8 text-xs h-8"
                />
                {deviceSearch && (
                  <button
                    type="button"
                    onClick={() => setDeviceSearch("")}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {deviceSearch.trim() && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                  {searchResults.length === 0 ? (
                    <div className="py-3 text-center text-xs text-muted-foreground">
                      No eligible devices found matching "{deviceSearch}"
                    </div>
                  ) : (
                    searchResults.map((device) => (
                      <div
                        key={device.device_id}
                        className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-mono font-medium text-foreground">
                            {device.device_id}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {device.model?.name || device.modelCode} · {device.eth_mac}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-6 text-[11px] gap-1 px-2 shrink-0"
                          onClick={() => handleAddDevice(device)}
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Devices List */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2 max-h-40 overflow-y-auto flex flex-col gap-1.5">
              {selectedDevices.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                  <Package className="h-5 w-5 text-muted-foreground/40" />
                  <span>No devices added yet. Search above to add units.</span>
                </div>
              ) : (
                selectedDevices.map((d) => (
                  <div
                    key={d.device_id}
                    className="flex items-center justify-between rounded-md bg-card border border-border/50 px-2.5 py-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <HardDrive className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-mono font-medium text-foreground">
                        {d.device_id}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                        {d.inventory_status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                        {d.model?.name || d.modelCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(d.device_id)}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                      title="Remove device from dispatch"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Optional Courier & Transfer Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Tracking Number (Optional)
              </label>
              <Input
                placeholder="e.g. BLUEDART-12345"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                className="text-xs font-mono h-8"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Notes (Optional)
              </label>
              <Input
                placeholder="e.g. Consignment stock"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedDevices.length === 0 || !vendorAccountId}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {loading
                ? "Dispatching..."
                : `Dispatch ${selectedDevices.length} Device${selectedDevices.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
