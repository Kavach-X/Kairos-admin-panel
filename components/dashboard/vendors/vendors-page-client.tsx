"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, ChevronRight, Store, X } from "lucide-react";
import type { VendorItem, VerificationStatus } from "@/lib/types";
import { verifyVendorAction } from "@/lib/actions/vendor.actions";
import { EmptyTableRow, PageHeader, SearchBox, StatusTabs, countBy } from "@/components/dashboard/list-page";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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
  const [isPending, startTransition] = React.useTransition();
  // Approve / Reject only run after the admin confirms in a dialog.
  const [confirm, setConfirm] = React.useState<{ vendor: VendorItem; status: VerificationStatus } | null>(null);
  const router = useRouter();
  const vendorHref = (v: VendorItem) => `/dashboard/vendors/${v.businessAccountId || v.id}`;

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
  const statusCounts = countBy(optimisticVendors, (v) => v.verificationStatus);
  const totalStores = optimisticVendors.reduce((acc, v) => acc + (v.businessAccount._count?.managedCustomers || 0), 0);
  const totalStock = optimisticVendors.reduce(
    (acc, v) => acc + (v.businessAccount._count?.custodianDevices || 0),
    0
  );

  function handleVerify(businessAccountId: string, status: VerificationStatus) {
    startTransition(async () => {
      applyOptimisticVerify({ businessAccountId, status });
      const res = await verifyVendorAction(businessAccountId, status);
      setConfirm(null);
      if (res.success) {
        toast.success(status === "VERIFIED" ? "Vendor approved" : "Vendor rejected");
      } else {
        toast.error(res.error || "Failed to update vendor status");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Partner Vendors"
        subtitle="Installation partners, KYC verification, and the hardware they hold"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total vendors"
          value={String(totalVendors)}
          info="Every installation partner registered with us, whatever their verification state."
          footer={<span className="text-[11px] text-muted-foreground">{totalStores} customer stores managed</span>}
        />
        <StatTile
          label="Pending KYC"
          value={String(pendingCount)}
          info="Vendors who signed up and are waiting for us to check their documents (PAN, GST, bank). They can't receive stock until approved."
          footer={
            pendingCount > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-3" />
                Waiting for review
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Nothing to review</span>
            )
          }
        />
        <StatTile
          label="Verified"
          value={String(verifiedCount)}
          info="Vendors whose documents we checked and approved. Only verified vendors can be sent stock and install for customers."
          footer={<span className="text-[11px] text-muted-foreground">Active partners</span>}
        />
        <StatTile
          label="Stock with vendors"
          value={String(totalStock)}
          info="Edge boxes currently held by vendors, sent to them for installation but not yet fitted at a customer site."
          footer={<span className="text-[11px] text-muted-foreground">Boxes not yet installed</span>}
        />
      </div>

      <div className="flex flex-col gap-3">
        <StatusTabs
          label="KYC status"
          tabs={STATUS_TABS.map((t) => ({ ...t, count: t.value === "ALL" ? totalVendors : (statusCounts[t.value] ?? 0) }))}
          active={activeTab}
          onChange={setActiveTab}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name, code, PAN or email..." />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
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
                <EmptyTableRow
                  colSpan={8}
                  icon={Store}
                  title={search || activeTab !== "ALL" ? "No matching vendors" : "No vendors yet"}
                  hint={search || activeTab !== "ALL" ? "Try another tab or clear the search." : "Vendors appear here after they sign up."}
                />
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
                      className="group cursor-pointer transition-colors hover:bg-muted/20"
                      onClick={() => router.push(vendorHref(vendor))}
                      onMouseEnter={() => router.prefetch(vendorHref(vendor))}
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
                                onClick={() => setConfirm({ vendor, status: "VERIFIED" })}
                              >
                                <Check className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 gap-1"
                                disabled={isPending}
                                onClick={() => setConfirm({ vendor, status: "REJECTED" })}
                              >
                                <X className="h-3 w-3" />
                                Reject
                              </Button>
                            </>
                          )}
                          <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
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

      <ConfirmModal
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.status === "VERIFIED" ? "Approve vendor KYC" : "Reject vendor KYC"}
        description={
          confirm?.status === "VERIFIED"
            ? `Approve "${confirm.vendor.companyName}"? They will be able to receive stock and install devices.`
            : `Reject "${confirm?.vendor.companyName}"? Their KYC will be marked as rejected.`
        }
        confirmText={confirm?.status === "VERIFIED" ? "Approve" : "Reject"}
        variant={confirm?.status === "VERIFIED" ? "default" : "destructive"}
        loading={isPending}
        onConfirm={() => {
          if (confirm) handleVerify(confirm.vendor.businessAccountId, confirm.status);
        }}
      />
    </div>
  );
}
