"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Building2,
  HardDrive,
  Video,
  Store,
  User,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type { CustomerItem } from "@/lib/types";

interface CustomerDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerItem | null;
  vendors: Array<{ id: string; name: string; vendorCode?: string }>;
  onStatusChange?: (customerId: string, status: "ACTIVE" | "SUSPENDED") => void;
  onReassignVendor?: (customerId: string, vendorAccountId: string) => void;
}

export function CustomerDetailsSheet({
  open,
  onOpenChange,
  customer,
  vendors,
  onStatusChange,
  onReassignVendor,
}: CustomerDetailsSheetProps) {
  const [isReassigning, setIsReassigning] = React.useState(false);
  const [selectedVendorId, setSelectedVendorId] = React.useState("");
  const [confirmSuspend, setConfirmSuspend] = React.useState(false);

  React.useEffect(() => {
    if (customer?.profile?.managedByVendor?.id) {
      setSelectedVendorId(customer.profile.managedByVendor.id);
    } else {
      setSelectedVendorId("");
    }
    setIsReassigning(false);
  }, [customer]);

  if (!customer) return null;

  const isActive = customer.status === "ACTIVE";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="p-6 pr-14 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Badge
              variant="outline"
              className={
                isActive
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
              }
            >
              {customer.status}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(customer.createdAt).toLocaleDateString()}
            </span>
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight text-foreground mt-2">
            {customer.name}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Customer Business Account
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-6 text-xs">
          <Link
            href={`/dashboard/customers/${customer.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Customer & Fleet Profile
          </Link>

          {/* Quick Hardware Stats */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-3">
            <div>
              <span className="text-[10px] text-muted-foreground block">Installed Units</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1 mt-0.5">
                <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
                {customer.installedBoxes ?? customer.activeBoxes}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Assigned Units</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                {customer.assignedBoxes ?? Math.max(0, (customer.counts?.devices ?? 0) - (customer.installedBoxes ?? customer.activeBoxes))}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">CCTV Cameras</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1 mt-0.5">
                <Video className="h-3.5 w-3.5 text-primary" />
                {customer.totalCameras}
              </span>
            </div>
          </div>

          {/* Owner Info */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Account Owner
            </span>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium text-foreground">{customer.owner.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email:
                </span>
                <span className="text-foreground flex items-center gap-1.5 font-mono text-xs">
                  <span>{customer.owner.email}</span>
                  {customer.owner.emailVerified ? (
                    <span title="Email Verified" className="cursor-help">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">(unverified)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Mobile:
                </span>
                <span className="text-foreground flex items-center gap-1.5 font-mono text-xs">
                  <span>{customer.owner.phoneNumber || "N/A"}</span>
                  {customer.owner.phoneNumber && (
                    customer.owner.phoneNumberVerified ? (
                      <span title="Mobile Phone Verified" className="cursor-help">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">(unverified)</span>
                    )
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Managing & Acquired Vendor */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-primary" />
              Partner Attribution
            </span>
            <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Managing Vendor:</span>
                <span className="font-medium text-foreground">
                  {customer.profile?.managedByVendor?.name || "Direct (Unassigned)"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Original Referral:</span>
                <span className="font-medium text-foreground">
                  {customer.profile?.acquiredByVendor?.name || "Direct"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Acquisition Type:</span>
                <span className="font-mono text-xs">{customer.profile?.acquisitionType || "DIRECT"}</span>
              </div>

              {/* Vendor Reassignment */}
              {isReassigning ? (
                <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                  <label className="text-[11px] font-medium text-foreground">
                    Select New Managing Vendor:
                  </label>
                  <SearchableSelect
                    value={selectedVendorId}
                    onValueChange={setSelectedVendorId}
                    placeholder="Search or select new vendor..."
                    searchPlaceholder="Filter vendors by name or code..."
                    options={vendors.map((v) => ({
                      value: v.id,
                      label: v.name,
                      subLabel: v.vendorCode,
                    }))}
                  />
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      disabled={!selectedVendorId}
                      onClick={() => {
                        onReassignVendor?.(customer.id, selectedVendorId);
                        setIsReassigning(false);
                      }}
                    >
                      Save Reassignment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setIsReassigning(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs w-full mt-1"
                  onClick={() => setIsReassigning(true)}
                >
                  Change Managing Vendor
                </Button>
              )}
            </div>
          </div>

          {/* Account Actions (Suspend/Activate) */}
          <div className="pt-4 border-t border-border/40 flex flex-col gap-2">
            {isActive ? (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 w-full"
                onClick={() => setConfirmSuspend(true)}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Suspend Customer Account
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  onStatusChange?.(customer.id, "ACTIVE");
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Reactivate Customer Account
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Suspend Confirmation Modal */}
    <ConfirmModal
      open={confirmSuspend}
      onOpenChange={setConfirmSuspend}
      title="Suspend Customer Account"
      description={
        <span>
          Are you sure you want to suspend account for{" "}
          <strong className="text-foreground">{customer.name}</strong>? Cloud video streaming will be temporarily halted and edge services paused until reactivated.
        </span>
      }
      confirmText="Suspend Account"
      variant="destructive"
      onConfirm={() => {
        onStatusChange?.(customer.id, "SUSPENDED");
        setConfirmSuspend(false);
      }}
    />
    </>
  );
}
