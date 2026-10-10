"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { updateTicketAction } from "@/lib/actions/ticket.actions";
import { getVendorsListAction } from "@/lib/actions/device.actions";
import { toast } from "sonner";
import { Loader2, RefreshCw, User, Building2, Store } from "lucide-react";
import type { TicketItem, TicketStatus, TicketPriority } from "@/lib/types";

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketItem | null;
  onOpenRma?: (ticket: TicketItem) => void;
  onSuccess?: () => void;
}

export function TicketDetailsDialog({
  open,
  onOpenChange,
  ticket,
  onOpenRma,
  onSuccess,
}: TicketDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TicketStatus>(ticket?.status || "OPEN");
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority || "MEDIUM");
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    ticket?.assignedVendorAccountId || ""
  );
  const [selectedVendor, setSelectedVendor] = useState<SearchableOption | null>(
    ticket?.assignedVendor
      ? { value: ticket.assignedVendor.id, label: ticket.assignedVendor.name }
      : null
  );

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setPriority(ticket.priority);
      setSelectedVendorId(ticket.assignedVendorAccountId || "");
      setSelectedVendor(
        ticket.assignedVendor
          ? { value: ticket.assignedVendor.id, label: ticket.assignedVendor.name }
          : null
      );
    }
  }, [ticket, open]);

  const handleSearchVendors = useCallback(async (query: string): Promise<SearchableOption[]> => {
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

  if (!ticket) return null;

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await updateTicketAction(ticket.id, {
        status,
        priority,
        assignedVendorAccountId: selectedVendorId ? selectedVendorId : null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update ticket");
        return;
      }

      toast.success("Ticket updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to update ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-visible">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
            <Badge
              variant={
                ticket.status === "RESOLVED"
                  ? "success"
                  : ticket.status === "CLOSED"
                  ? "secondary"
                  : ticket.status === "IN_PROGRESS"
                  ? "warning"
                  : "info"
              }
            >
              {ticket.status}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold leading-snug">
            {ticket.title}
          </DialogTitle>
          <DialogDescription>
            Created on {new Date(ticket.createdAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Customer & Current Routing Details */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
            <div>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="size-3.5" /> Customer Site
              </span>
              <p className="mt-1 font-medium">{ticket.customerAccount?.name || "Unknown"}</p>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Store className="size-3.5" /> Current Assignee
              </span>
              <p className="mt-1 font-medium text-foreground">
                {ticket.assignedVendor?.name || "Kairos Central Operations"}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Issue Description</label>
            <div className="rounded-lg border bg-background p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </div>
          </div>

          {/* Status & Priority Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ticket-status" className="text-xs font-medium text-foreground">
                Status
              </label>
              <select
                id="ticket-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ticket-priority" className="text-xs font-medium text-foreground">
                Priority
              </label>
              <select
                id="ticket-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Servicing Vendor Partner Assignment */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-border/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Store className="size-3.5 text-muted-foreground" />
                Assign Servicing Vendor Partner
              </label>
              {selectedVendorId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendorId("");
                    setSelectedVendor(null);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear (Central Support)
                </button>
              )}
            </div>
            <SearchableSelect
              value={selectedVendorId}
              selectedOption={selectedVendor}
              onValueChange={(val, opt) => {
                setSelectedVendorId(val);
                setSelectedVendor(opt || null);
              }}
              onSearch={handleSearchVendors}
              placeholder="Central Support (No vendor partner assigned)"
              searchPlaceholder="Type vendor partner name or code..."
              searchPromptText="Type vendor partner name or code to assign..."
              noResultsText="No matching vendor partner found"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0 pt-2">
          {onOpenRma && (
            <Button
              type="button"
              variant="outline"
              className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => {
                onOpenChange(false);
                onOpenRma(ticket);
              }}
            >
              <RefreshCw className="mr-2 size-4" />
              Swap Device (RMA)
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
