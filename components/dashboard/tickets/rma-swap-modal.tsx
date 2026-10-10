"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rmaReplaceDeviceAction } from "@/lib/actions/ticket.actions";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import type { CustomerItem, DeviceItem, TicketItem } from "@/lib/types";

interface RmaSwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: TicketItem | null;
  customers: CustomerItem[];
  devices: DeviceItem[];
  onSuccess?: () => void;
}

export function RmaSwapModal({
  open,
  onOpenChange,
  ticket,
  customers,
  devices,
  onSuccess,
}: RmaSwapModalProps) {
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(ticket?.businessAccountId || "");
  const [oldDeviceId, setOldDeviceId] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    setCustomerId(ticket?.businessAccountId || "");
    setOldDeviceId("");
    setNewDeviceId("");
    setReason("");
  }, [open, ticket]);

  // Customer devices (deployed or at customer)
  const effectiveCustomerId = ticket?.businessAccountId || customerId;
  const customerDevices = devices.filter(
    (d) => d.businessAccountId === effectiveCustomerId
  );

  // Available devices in stock (IN_STOCK)
  const availableStock = devices.filter(
    (d) => d.inventory_status === "IN_STOCK"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustomer = ticket?.businessAccountId || customerId;
    if (!targetCustomer) {
      toast.error("Please select a customer site");
      return;
    }
    if (!oldDeviceId.trim()) {
      toast.error("Please specify the defective device");
      return;
    }
    if (!newDeviceId) {
      toast.error("Please select a fresh replacement device");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please state the reason for hardware replacement");
      return;
    }

    setLoading(true);
    try {
      const res = await rmaReplaceDeviceAction({
        customerAccountId: targetCustomer,
        oldDeviceId: oldDeviceId.trim(),
        newDeviceId: newDeviceId,
        reason: reason.trim(),
        ticketId: ticket?.id,
      });

      if (!res.success) {
        toast.error(res.error || "Hardware replacement failed");
        return;
      }

      toast.success("Device swapped successfully! Inventory & customer site updated.");
      onOpenChange(false);
      setOldDeviceId("");
      setNewDeviceId("");
      setReason("");
      onSuccess?.();
    } catch {
      toast.error("An error occurred during device replacement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <RefreshCw className="size-4" />
            </div>
            <DialogTitle>Hardware Swap (RMA)</DialogTitle>
          </div>
          <DialogDescription>
            Swap a broken EdgeBox with a fresh unit from inventory. Configuration and customer assignment will transfer seamlessly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {!ticket && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rma-customer" className="text-xs font-medium text-foreground">
                Customer Site *
              </label>
              <select
                id="rma-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Select customer site</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {ticket && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Linked Support Ticket</p>
              <p className="font-semibold text-foreground">
                {ticket.title} ({ticket.customerAccount?.name || "Customer"})
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="old-device" className="text-xs font-medium text-foreground">
              Defective Device *
            </label>
            {customerDevices.length > 0 ? (
              <select
                id="old-device"
                value={oldDeviceId}
                onChange={(e) => setOldDeviceId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Select installed device to swap</option>
                {customerDevices.map((d) => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.model?.name || d.modelCode} — {d.device_id} ({d.inventory_status})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="old-device"
                placeholder="Enter Device ID or Serial number of defective unit"
                value={oldDeviceId}
                onChange={(e) => setOldDeviceId(e.target.value)}
                required
              />
            )}
            <p className="text-[11px] text-muted-foreground">
              The broken device will be marked DEFECTIVE and returned to warehouse.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-device" className="text-xs font-medium text-foreground">
              Replacement Device (From Inventory) *
            </label>
            {availableStock.length > 0 ? (
              <select
                id="new-device"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Select fresh unit from stock</option>
                {availableStock.map((d) => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.model?.name || d.modelCode} — {d.device_id} ({d.eth_mac})
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-500">
                No fresh devices in stock. Please register a device first in Devices page.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reason" className="text-xs font-medium text-foreground">
              Failure Reason *
            </label>
            <textarea
              id="reason"
              placeholder="e.g. Device does not power on after electrical surge; status LED blinking red"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>

          <DialogFooter className="pt-2">
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
              disabled={loading || (availableStock.length === 0 && !newDeviceId)}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Complete Swap
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
