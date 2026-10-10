"use client";

import * as React from "react";
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
  Search,
  Building2,
  HardDrive,
  Video,
  Store,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Package,
  X,
} from "lucide-react";
import type { CustomerItem } from "@/lib/types";
import {
  getCustomersAction,
  updateCustomerStatusAction,
  reassignCustomerVendorAction,
} from "@/lib/actions/customer.actions";
import { getVendorsListAction } from "@/lib/actions/device.actions";
import { CustomerDetailsSheet } from "@/components/dashboard/customers/customer-details-sheet";
import { toast } from "sonner";

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: "All Customers", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<CustomerItem[]>([]);
  const [vendors, setVendors] = React.useState<
    Array<{ id: string; name: string; vendorCode?: string }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerItem | null>(null);

  // Fetch customers on mount and when status tab changes (search does NOT hit the network)
  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    const [custRes, vendorRes] = await Promise.all([
      getCustomersAction(activeTab !== "ALL" ? activeTab : undefined),
      getVendorsListAction(),
    ]);

    if (custRes.success && custRes.data) {
      setCustomers(custRes.data);
    }
    if (vendorRes.success && vendorRes.data) {
      setVendors(vendorRes.data);
    }
    setLoading(false);
  }, [activeTab]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Client-side instantaneous filtering: 0ms lag, zero network requests on search
  const filteredCustomers = React.useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.owner?.name && c.owner.name.toLowerCase().includes(q)) ||
        (c.owner?.email && c.owner.email.toLowerCase().includes(q)) ||
        (c.owner?.phoneNumber && c.owner.phoneNumber.toLowerCase().includes(q)) ||
        (c.profile?.managedByVendor?.name && c.profile.managedByVendor.name.toLowerCase().includes(q)) ||
        (c.profile?.managedByVendor?.vendorProfile?.companyName &&
          c.profile.managedByVendor.vendorProfile.companyName.toLowerCase().includes(q)) ||
        (c.profile?.managedByVendor?.vendorProfile?.vendorCode &&
          c.profile.managedByVendor.vendorProfile.vendorCode.toLowerCase().includes(q))
      );
    });
  }, [customers, search]);

  const totalCustomers = customers.length;
  const totalAssignedBoxes = customers.reduce(
    (acc, c) => acc + (c.assignedBoxes ?? Math.max(0, (c.counts?.devices ?? 0) - (c.installedBoxes ?? c.activeBoxes ?? 0))),
    0
  );
  const totalInstalledBoxes = customers.reduce(
    (acc, c) => acc + (c.installedBoxes ?? c.activeBoxes ?? 0),
    0
  );
  const totalCameras = customers.reduce((acc, c) => acc + c.totalCameras, 0);

  async function handleStatusChange(
    customerId: string,
    status: "ACTIVE" | "SUSPENDED"
  ) {
    const res = await updateCustomerStatusAction(customerId, status);
    if (res.success) {
      toast.success(`Customer status updated to ${status}`);
      fetchCustomers();
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer((prev) => (prev ? { ...prev, status } : null));
      }
    } else {
      toast.error(res.error || "Failed to update customer status");
    }
  }

  async function handleReassignVendor(customerId: string, vendorAccountId: string) {
    const res = await reassignCustomerVendorAction(customerId, vendorAccountId);
    if (res.success) {
      toast.success("Managing vendor partner reassigned successfully");
      fetchCustomers();
    } else {
      toast.error(res.error || "Failed to reassign vendor");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Customers & Stores
          </h1>
          <p className="text-xs text-muted-foreground">
            Subscriber store locations, hardware deployments, and camera channels
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Stores
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                active
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalCustomers}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                business subscribers
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Assigned Boxes
              </span>
              <span className="font-mono text-[11px] font-medium text-amber-600 dark:text-amber-400">
                pending setup
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalAssignedBoxes}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                hardware units
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Installed Boxes
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                live
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalInstalledBoxes}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                surveillance units
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Camera Streams
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                RTSP feeds
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalCameras}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                video channels
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
              placeholder="Search store or owner..."
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
                <th className="px-4 py-2.5 font-medium">Store Name</th>
                <th className="px-4 py-2.5 font-medium">Owner & Contact</th>
                <th className="px-4 py-2.5 font-medium">Managing Vendor</th>
                <th className="px-4 py-2.5 font-medium">Boxes</th>
                <th className="px-4 py-2.5 font-medium">Cameras</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-foreground">
                      {search ? "No matching customer stores found" : "No customer stores found"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {search ? "Try adjusting your search criteria." : ""}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isActive = cust.status === "ACTIVE";

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedCustomer(cust)}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {cust.name}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{cust.owner.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground font-mono">
                          <span className="truncate max-w-[160px]" title={cust.owner.email}>
                            {cust.owner.email}
                          </span>
                          {cust.owner.phoneNumber && (
                            <>
                              <span className="text-muted-foreground/40 font-sans">·</span>
                              <span className="whitespace-nowrap">{cust.owner.phoneNumber}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-foreground">
                        {cust.profile?.managedByVendor?.name ? (
                          <div className="flex items-center gap-1.5">
                            <Store className="h-3 w-3 text-primary shrink-0" />
                            <span>{cust.profile.managedByVendor.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Direct</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {(() => {
                          const installed = cust.installedBoxes ?? cust.activeBoxes ?? 0;
                          const assigned = cust.assignedBoxes ?? Math.max(0, (cust.counts?.devices ?? 0) - installed);
                          const hasAny = installed > 0 || assigned > 0;

                          if (!hasAny) {
                            return <span className="text-muted-foreground/70 text-xs">0 Units</span>;
                          }

                          return (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {installed > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 text-[11px] px-2 py-0.5 font-medium"
                                >
                                  {installed} Installed
                                </Badge>
                              )}
                              {assigned > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 text-[11px] px-2 py-0.5 font-medium"
                                >
                                  {assigned} Assigned
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {cust.totalCameras} Feeds
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                          }
                        >
                          {cust.status}
                        </Badge>
                      </td>

                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => setSelectedCustomer(cust)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </Button>
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
      <CustomerDetailsSheet
        open={Boolean(selectedCustomer)}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
        customer={selectedCustomer}
        vendors={vendors}
        onStatusChange={handleStatusChange}
        onReassignVendor={handleReassignVendor}
      />
    </div>
  );
}
