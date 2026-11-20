"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronRight, Store } from "lucide-react";
import type { CustomerItem } from "@/lib/types";
import { EmptyTableRow, PageHeader, SearchBox, StatusTabs, countBy } from "@/components/dashboard/list-page";
import { StatTile } from "@/components/dashboard/stat-tile";

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: "All Customers", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

interface CustomersPageClientProps {
  customers: CustomerItem[];
}

const installedOf = (c: CustomerItem) => c.installedBoxes ?? c.activeBoxes ?? 0;
const assignedOf = (c: CustomerItem) => c.assignedBoxes ?? Math.max(0, (c.counts?.devices ?? 0) - installedOf(c));

/**
 * Customer list. Status changes and vendor reassignment live on the customer page,
 * which every row opens.
 */
export function CustomersPageClient({ customers }: CustomersPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const customerHref = (id: string) => `/dashboard/customers/${id}`;

  const filteredCustomers = React.useMemo(() => {
    const term = search.toLowerCase();
    return customers.filter((c) => {
      if (activeTab !== "ALL" && c.status !== activeTab) return false;
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        (c.owner?.name && c.owner.name.toLowerCase().includes(term)) ||
        (c.owner?.email && c.owner.email.toLowerCase().includes(term)) ||
        (c.owner?.phoneNumber && c.owner.phoneNumber.toLowerCase().includes(term)) ||
        (c.profile?.managedByVendor?.name && c.profile.managedByVendor.name.toLowerCase().includes(term)) ||
        (c.profile?.managedByVendor?.vendorProfile?.companyName &&
          c.profile.managedByVendor.vendorProfile.companyName.toLowerCase().includes(term)) ||
        (c.profile?.managedByVendor?.vendorProfile?.vendorCode &&
          c.profile.managedByVendor.vendorProfile.vendorCode.toLowerCase().includes(term))
      );
    });
  }, [customers, activeTab, search]);

  const totalCustomers = customers.length;
  const statusCounts = countBy(customers, (c) => c.status);
  const totalInstalledBoxes = customers.reduce((acc, c) => acc + installedOf(c), 0);
  const totalAssignedBoxes = customers.reduce((acc, c) => acc + assignedOf(c), 0);
  const totalCameras = customers.reduce((acc, c) => acc + c.totalCameras, 0);
  const withoutBoxes = customers.filter((c) => installedOf(c) + assignedOf(c) === 0).length;
  const viaVendor = customers.filter((c) => c.profile?.managedByVendor).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Customer Stores" subtitle="Customer accounts, the boxes and cameras at each site, and who manages them" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Customers"
          value={String(totalCustomers)}
          info="Every customer account (a store or site owner). The line below shows how many came through a vendor partner rather than signing up directly."
          footer={<span className="text-[11px] text-muted-foreground">{viaVendor} managed by vendors</span>}
        />
        <StatTile
          label="Boxes installed"
          value={String(totalInstalledBoxes)}
          info="Edge boxes fitted and running at customer sites."
          footer={<span className="text-[11px] text-muted-foreground">{totalAssignedBoxes} more assigned, not yet installed</span>}
        />
        <StatTile
          label="Cameras"
          value={String(totalCameras)}
          info="Camera feeds connected to boxes at customer sites. Each camera is watched by the box it is plugged into."
          footer={
            <span className="text-[11px] text-muted-foreground">
              {totalInstalledBoxes > 0 ? `≈ ${(totalCameras / totalInstalledBoxes).toFixed(1)} per installed box` : "No boxes installed yet"}
            </span>
          }
        />
        <StatTile
          label="Without a box"
          value={String(withoutBoxes)}
          info="Customers who have an account but no box assigned or installed yet, so nothing is protecting their site. Usually waiting for a shipment or an installation visit."
          footer={<span className="text-[11px] text-muted-foreground">{withoutBoxes > 0 ? "Not protected yet" : "Every customer has a box"}</span>}
        />
      </div>

      <div className="flex flex-col gap-3">
        <StatusTabs
          label="Account status"
          tabs={STATUS_TABS.map((t) => ({ ...t, count: t.value === "ALL" ? totalCustomers : (statusCounts[t.value] ?? 0) }))}
          active={activeTab}
          onChange={setActiveTab}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search store, owner, phone or vendor..." />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
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
                <th className="px-4 py-2.5 font-medium text-right"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredCustomers.length === 0 ? (
                <EmptyTableRow
                  colSpan={7}
                  icon={Building2}
                  title={search || activeTab !== "ALL" ? "No matching customers" : "No customers yet"}
                  hint={search || activeTab !== "ALL" ? "Try another tab or clear the search." : "Customers appear here once they are onboarded."}
                />
              ) : (
                filteredCustomers.map((cust) => {
                  const isActive = cust.status === "ACTIVE";

                  return (
                    <tr
                      key={cust.id}
                      className="group cursor-pointer transition-colors hover:bg-muted/20"
                      onClick={() => router.push(customerHref(cust.id))}
                      onMouseEnter={() => router.prefetch(customerHref(cust.id))}
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
                          const installed = installedOf(cust);
                          const assigned = assignedOf(cust);
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

                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="ml-auto size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
