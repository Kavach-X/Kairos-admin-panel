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
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { Truck, RefreshCw, AlertCircle, CheckCircle2, Copy, Check } from "lucide-react";
import type { Device } from "@/lib/types";
import { shipToCustomerAction } from "@/lib/actions/device.actions";
import { getCustomersAction } from "@/lib/actions/customer.actions";

interface ShipCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
  onSuccess?: () => void;
}

export function ShipCustomerModal({
  open,
  onOpenChange,
  device,
  onSuccess,
}: ShipCustomerModalProps) {
  const [customerBusinessAccountId, setCustomerBusinessAccountId] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] = React.useState<SearchableOption | null>(null);
  const [courierName, setCourierName] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [claimResult, setClaimResult] = React.useState<{
    claim_code: string;
    claim_code_expires_at: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCustomerBusinessAccountId("");
      setSelectedCustomer(null);
      setCourierName("");
      setTrackingNumber("");
      setError(null);
      setClaimResult(null);
      setCopiedCode(false);
      // NOTE: We deliberately do NOT fetch any customers initially.
      // Search is strictly backend-driven and triggered on keystroke.
    }
  }, [open]);

  // Backend search triggered only on user keystroke
  const handleSearchCustomers = React.useCallback(async (query: string): Promise<SearchableOption[]> => {
    const res = await getCustomersAction(undefined, query);
    if (res.success && res.data) {
      return res.data.map((c) => {
        const parts = [
          c.owner?.name,
          c.owner?.email,
          c.owner?.phoneNumber,
        ].filter(Boolean);
        return {
          value: c.id,
          label: c.name || c.owner?.name || "Unnamed Customer",
          subLabel: parts.join(" · "),
        };
      });
    }
    return [];
  }, []);

  if (!device) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!device) return;

    if (!customerBusinessAccountId.trim()) {
      setError("Please search and select a customer");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await shipToCustomerAction({
      device_id: device.device_id,
      customerBusinessAccountId: customerBusinessAccountId.trim(),
      courier_name: courierName.trim() || undefined,
      tracking_number: trackingNumber.trim() || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to ship device");
    } else {
      if (res.data?.claim_code) {
        setClaimResult({
          claim_code: res.data.claim_code,
          claim_code_expires_at: res.data.claim_code_expires_at,
        });
      }
      onSuccess?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-visible">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Send to Customer</DialogTitle>
              <DialogDescription>
                Assign unit <strong className="text-foreground">{device.device_id}</strong> to a customer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {claimResult ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                <CheckCircle2 className="h-4 w-4" />
                Device Sent! Customer Claim Code Created
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Give this code to the customer. They can claim it in their app.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-medium">
                  Claim Code
                </span>
                <p className="text-lg font-bold font-mono tracking-widest text-primary mt-0.5">
                  {claimResult.claim_code}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(claimResult.claim_code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? "Copied" : "Copy"}
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-1">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Select Customer <span className="text-destructive">*</span>
              </label>
              <SearchableSelect
                value={customerBusinessAccountId}
                selectedOption={selectedCustomer}
                onValueChange={(val, opt) => {
                  setCustomerBusinessAccountId(val);
                  setSelectedCustomer(opt || null);
                  setError(null);
                }}
                onSearch={handleSearchCustomers}
                placeholder="Search and select customer..."
                searchPlaceholder="Search by name, email, or phone..."
                searchPromptText="Type customer name, email, or phone to search..."
                noResultsText="No matching customer found"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  Courier (Optional)
                </label>
                <Input
                  placeholder="e.g. Delhivery"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  className="text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  Tracking Number (Optional)
                </label>
                <Input
                  placeholder="e.g. 12345678"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  className="text-xs font-mono"
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
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {loading ? "Sending..." : "Send to Customer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
