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
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Link from "next/link";
import {
  Store,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  CreditCard,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from "lucide-react";
import type { VendorItem, VerificationStatus } from "@/lib/types";

interface VendorDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorItem | null;
  onVerify?: (vendorId: string, status: VerificationStatus) => void | Promise<void>;
  isVerifying?: boolean;
}

const statusBadgeStyles: Record<string, { label: string; className: string }> = {
  VERIFIED: {
    label: "Verified",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  PENDING: {
    label: "Pending KYC",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

export function VendorDetailsSheet({
  open,
  onOpenChange,
  vendor,
  onVerify,
  isVerifying = false,
}: VendorDetailsSheetProps) {
  const [confirmVerify, setConfirmVerify] = React.useState<VerificationStatus | null>(null);

  if (!vendor) return null;

  const kycConfig = statusBadgeStyles[vendor.verificationStatus] || {
    label: vendor.verificationStatus,
    className: "",
  };

  const counts = vendor.businessAccount._count || {
    acquiredCustomers: 0,
    managedCustomers: 0,
    custodianDevices: 0,
    installedDevices: 0,
  };

  const bank = vendor.businessAccount.bankDetails?.[0];
  const owner = vendor.businessAccount.owner;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="p-6 pr-14 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={kycConfig.className}>
              {kycConfig.label}
            </Badge>
            <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
              {vendor.vendorCode}
            </span>
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight text-foreground mt-2">
            {vendor.companyName}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Legal: {vendor.legalName || vendor.companyName}
          </SheetDescription>
          <div className="mt-3">
            <Link
              href={`/dashboard/vendors/${vendor.businessAccountId || vendor.id}`}
              className="inline-flex items-center justify-center gap-2 w-full rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors"
            >
              <span>Open Dedicated Vendor Profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-6 text-xs">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3">
            <div>
              <span className="text-[10px] text-muted-foreground block">Stock on Shelf</span>
              <span className="text-sm font-bold text-foreground">
                {counts.custodianDevices} Devices
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Installed in Field</span>
              <span className="text-sm font-bold text-foreground">
                {counts.installedDevices} Devices
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Managed Stores</span>
              <span className="text-sm font-bold text-foreground">
                {counts.managedCustomers} Customers
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Acquired (Referrals)</span>
              <span className="text-sm font-bold text-foreground">
                {counts.acquiredCustomers} Customers
              </span>
            </div>
          </div>

          {/* Tax & Registration Info */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Tax & Business Info
            </span>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 font-mono text-[11px]">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="font-sans text-muted-foreground">PAN:</span>
                <span className="text-foreground font-bold">{vendor.panNumber}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="font-sans text-muted-foreground">GSTIN:</span>
                <span className="text-foreground">{vendor.gstNumber || "Not Provided"}</span>
              </div>
              <div className="flex justify-between items-start pt-1 font-sans text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  Address:
                </span>
                <span className="text-right text-foreground max-w-[200px]">
                  {vendor.address || "Not Provided"}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Primary Contact
            </span>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium text-foreground">{owner?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email:
                </span>
                <span className="text-foreground">{owner?.email || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone:
                </span>
                <span className="text-foreground">{owner?.phoneNumber || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Settlement Bank Account
            </span>
            {bank ? (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="font-medium text-foreground">{bank.bank_name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/40 font-mono text-[11px]">
                  <span className="font-sans text-muted-foreground">Account:</span>
                  <span className="text-foreground font-bold">{bank.account_no}</span>
                </div>
                <div className="flex justify-between items-center font-mono text-[11px]">
                  <span className="font-sans text-muted-foreground">IFSC:</span>
                  <span className="text-foreground">{bank.ifsc}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic p-2">
                No bank account submitted yet.
              </p>
            )}
          </div>

          {/* KYC Approval Actions */}
          {vendor.verificationStatus === "PENDING" && (
            <div className="pt-4 border-t border-border/40 flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={isVerifying}
                onClick={() => setConfirmVerify("VERIFIED")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve KYC
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 gap-1.5"
                disabled={isVerifying}
                onClick={() => setConfirmVerify("REJECTED")}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          )}

          {/* Full Page Details Navigation */}
          <div className="pt-2 border-t border-border/40">
            <Link
              href={`/dashboard/vendors/${vendor.businessAccountId || vendor.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 hover:border-primary/60 bg-transparent px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors h-9"
            >
              <span>View Full Vendor Profile & Inventory</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Verification Confirmation Modal */}
    <ConfirmModal
      open={Boolean(confirmVerify)}
      onOpenChange={(open) => !open && setConfirmVerify(null)}
      title={confirmVerify === "VERIFIED" ? "Approve Vendor KYC" : "Reject Vendor KYC"}
      description={
        confirmVerify === "VERIFIED" ? (
          <span>
            Approve KYB compliance and activate vendor status for{" "}
            <strong className="text-foreground">{vendor.companyName}</strong>? Once approved, this partner will be authorized to hold consignment box inventory and deploy customer sites.
          </span>
        ) : (
          <span>
            Reject KYC compliance for{" "}
            <strong className="text-foreground">{vendor.companyName}</strong>? The partner will be flagged as rejected and restricted from holding stock.
          </span>
        )
      }
      confirmText={confirmVerify === "VERIFIED" ? "Approve KYC" : "Reject KYC"}
      variant={confirmVerify === "VERIFIED" ? "default" : "destructive"}
      loading={isVerifying}
      onConfirm={async () => {
        if (confirmVerify) {
          await onVerify?.(vendor.businessAccountId, confirmVerify);
          setConfirmVerify(null);
          onOpenChange(false);
        }
      }}
    />
    </>
  );
}
