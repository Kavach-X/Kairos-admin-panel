"use client";

import * as React from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Search,
  Store,
  Eye,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import type { VendorItem, VerificationStatus } from "@/lib/types";
import { verifyVendorAction } from "@/lib/actions/vendor.actions";
import { VendorDetailsSheet } from "@/components/dashboard/vendors/vendor-details-sheet";
import { toast } from "sonner";

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: "All Vendors", value: "ALL" },
  { label: "Pending KYC", value: "PENDING" },
  { label: "Verified", value: "VERIFIED" },
  { label: "Rejected", value: "REJECTED" },
];

const kycBadgeStyles: Record<string, { label: string; className: string }> = {
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

interface VendorsPageClientProps {
  vendors: VendorItem[];
}

export function VendorsPageClient({ vendors }: VendorsPageClientProps) {
  const [activeTab, setActiveTab] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [selectedVendorId, setSelectedVendorId] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // `vendors` is the real Server Component data, refreshed automatically via
  // `revalidatePath` inside `verifyVendorAction` after every mutation. The
  // optimistic layer only needs to patch it for the instant the mutation is
  // in flight — React reverts to the real `vendors` the moment it updates.
  const [optimisticVendors, applyOptimisticVerify] = React.useOptimistic(
    vendors,
    (state, action: { businessAccountId: string; status: VerificationStatus }) =>
      state.map((v) =>
        v.businessAccountId === action.businessAccountId
          ? { ...v, verificationStatus: action.status }
          : v
      )
  );

  // Deriving the selected vendor from the live list on every render means
  // the sheet can never go stale — no manual re-sync needed after a mutation.
  const selectedVendor = selectedVendorId
    ? optimisticVendors.find((v) => v.businessAccountId === selectedVendorId) || null
    : null;

  const filteredVendors = React.useMemo(() => {
    const term = search.toLowerCase();
    return optimisticVendors.filter((v) => {
      if (activeTab !== "ALL" && v.verificationStatus !== activeTab) return false;
      if (!term) return true;
      return (
        v.companyName.toLowerCase().includes(term) ||
        v.vendorCode.toLowerCase().includes(term) ||
        v.panNumber.toLowerCase().includes(term) ||
        (v.businessAccount.owner?.email && v.businessAccount.owner.email.toLowerCase().includes(term))
      );
    });
  }, [optimisticVendors, activeTab, search]);

  const totalVendors = optimisticVendors.length;
  const pendingCount = optimisticVendors.filter((v) => v.verificationStatus === "PENDING").length;
  const verifiedCount = optimisticVendors.filter((v) => v.verificationStatus === "VERIFIED").length;
  const totalStock = optimisticVendors.reduce(
    (acc, v) => acc + (v.businessAccount._count?.custodianDevices || 0),
    0
  );

  function handleVerify(businessAccountId: string, status: VerificationStatus) {
    startTransition(async () => {
      applyOptimisticVerify({ businessAccountId, status });
      const res = await verifyVendorAction(businessAccountId, status);
      if (res.success) {
        toast.success(`Vendor verification status updated to ${status}`);
      } else {
        toast.error(res.error || "Failed to update vendor status");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Partner Vendors
          </h1>
          <p className="text-xs text-muted-foreground">
            CCTV distributor accounts, KYC verification audits, and consignment hardware
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Vendors
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                registered
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {totalVendors}
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                partner network
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Pending KYC
              </span>
              <span
                className={`font-mono text-[11px] font-medium ${
                  pendingCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {pendingCount > 0 ? `${pendingCount} review` : "all clear"}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {pendingCount}
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                document checks
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Verified
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                authorized
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {verifiedCount}
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                active partners
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Shelf Stock
              </span>
              <span className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400">
                consignment
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {totalStock}
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                field units held
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
              placeholder="Search by name, code, PAN..."
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

      {/* Table */}
      <div className="overflow-hidden border border-border/50 bg-card shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Company Name</th>
                <th className="px-4 py-2.5 font-medium">Vendor Code</th>
                <th className="px-4 py-2.5 font-medium">Contact / Email</th>
                <th className="px-4 py-2.5 font-medium">PAN Number</th>
                <th className="px-4 py-2.5 font-medium">KYC Status</th>
                <th className="px-4 py-2.5 font-medium">Stock Held</th>
                <th className="px-4 py-2.5 font-medium">Managed Stores</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Store className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-foreground">No vendors found</p>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => {
                  const statusConfig = kycBadgeStyles[vendor.verificationStatus] || {
                    label: vendor.verificationStatus,
                    className: "",
                  };

                  const counts = vendor.businessAccount._count || {
                    acquiredCustomers: 0,
                    managedCustomers: 0,
                    custodianDevices: 0,
                    installedDevices: 0,
                  };

                  return (
                    <tr
                      key={vendor.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedVendorId(vendor.businessAccountId)}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {vendor.companyName}
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-primary">
                        {vendor.vendorCode}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {vendor.businessAccount.owner?.email || "N/A"}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {vendor.panNumber}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusConfig.className}>
                          {statusConfig.label}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {counts.custodianDevices} Units
                      </td>

                      <td className="px-4 py-3 text-foreground">
                        {counts.managedCustomers} Stores
                      </td>

                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {vendor.verificationStatus === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30 gap-1"
                                disabled={isPending}
                                onClick={() => handleVerify(vendor.businessAccountId, "VERIFIED")}
                              >
                                <Check className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 gap-1"
                                disabled={isPending}
                                onClick={() => handleVerify(vendor.businessAccountId, "REJECTED")}
                              >
                                <X className="h-3 w-3" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setSelectedVendorId(vendor.businessAccountId)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Link
                            href={`/dashboard/vendors/${vendor.businessAccountId || vendor.id}`}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-xs"
                            title="Open full page vendor profile"
                          >
                            <span>Full Profile</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Sheet */}
      <VendorDetailsSheet
        open={Boolean(selectedVendor)}
        onOpenChange={(open) => !open && setSelectedVendorId(null)}
        vendor={selectedVendor}
        onVerify={handleVerify}
        isVerifying={isPending}
      />
    </div>
  );
}
