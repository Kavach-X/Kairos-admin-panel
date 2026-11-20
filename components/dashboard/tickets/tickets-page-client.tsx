"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Ticket, ArrowLeftRight, Loader2, AlertTriangle } from "lucide-react";
import { EmptyTableRow, PageHeader, SearchBox, StatusTabs, countBy } from "@/components/dashboard/list-page";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TimeAgo } from "@/components/dashboard/overview/time-ago";
import { getTicketsAction } from "@/lib/actions/ticket.actions";
import { getCustomersAction } from "@/lib/actions/customer.actions";
import { getDevicesAction } from "@/lib/actions/device.actions";
import { CreateTicketModal } from "@/components/dashboard/tickets/create-ticket-modal";
import { TicketDetailsDialog } from "@/components/dashboard/tickets/ticket-details-dialog";
import { RmaSwapModal } from "@/components/dashboard/tickets/rma-swap-modal";
import type { TicketItem, CustomerItem, DeviceItem } from "@/lib/types";

const priorityBadges: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "warning" | "info" }
> = {
  URGENT: { label: "Urgent", variant: "destructive" },
  HIGH: { label: "High", variant: "destructive" },
  MEDIUM: { label: "Medium", variant: "warning" },
  LOW: { label: "Low", variant: "info" },
};

const statusBadges: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "info" }
> = {
  OPEN: { label: "Open", variant: "info" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  RESOLVED: { label: "Resolved", variant: "success" },
  CLOSED: { label: "Closed", variant: "secondary" },
};

interface TicketsInitialData {
  tickets: TicketItem[];
  customers: CustomerItem[];
  devices: DeviceItem[];
}

function TicketsPageContent({ initial }: { initial: TicketsInitialData }) {
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("selected");

  const [tickets, setTickets] = useState<TicketItem[]>(initial.tickets);
  const [customers, setCustomers] = useState<CustomerItem[]>(initial.customers);
  const [devices, setDevices] = useState<DeviceItem[]>(initial.devices);
  const [loading, setLoading] = useState(false);

  // Filters (all in the browser: the full ticket list is loaded)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [rmaOpen, setRmaOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Auto-open ticket from URL query param (?selected=...)
  useEffect(() => {
    if (selectedParam && tickets.length > 0) {
      const match = tickets.find((t) => t.id === selectedParam);
      if (match) {
        setSelectedTicket(match);
        setDetailsOpen(true);
      }
    }
  }, [selectedParam, tickets]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketRes, customerRes, deviceRes] = await Promise.all([
        getTicketsAction({}),
        getCustomersAction(),
        getDevicesAction({ limit: 250 }),
      ]);

      if (ticketRes.success && ticketRes.data) {
        setTickets(ticketRes.data);
      }
      if (customerRes.success && customerRes.data) {
        setCustomers(customerRes.data);
      }
      if (deviceRes.success && deviceRes.data?.items) {
        setDevices(deviceRes.data.items);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter in memory: instant, and the tab counts below always match the list.
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.customerAccount?.name.toLowerCase().includes(q) ||
      t.assignedVendor?.name.toLowerCase().includes(q)
    );
  });

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "RESOLVED" || t.status === "CLOSED"
  ).length;
  // Urgent = high/urgent priority and still being worked on (resolved and closed don't count).
  const urgentCount = tickets.filter(
    (t) => (t.priority === "URGENT" || t.priority === "HIGH") && (t.status === "OPEN" || t.status === "IN_PROGRESS")
  ).length;
  const statusCounts = countBy(tickets, (t) => t.status);
  const openTickets = tickets.filter((t) => t.status === "OPEN");
  const oldestOpen = openTickets.reduce<string | null>((a, t) => (!a || t.createdAt < a ? t.createdAt : a), null);
  const unassignedOpen = openTickets.filter((t) => !t.assignedVendor).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Support & RMA Tickets"
        subtitle="Customer issue tickets, hardware fault reports, and technician assignments"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-amber-500/30 text-xs font-normal text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => {
                setSelectedTicket(null);
                setRmaOpen(true);
              }}
            >
              <ArrowLeftRight className="size-3.5 text-amber-500" />
              Hardware Swap (RMA)
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs font-normal" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              Create Ticket
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Open"
          value={String(openCount)}
          info="New tickets nobody has started on yet. The line below shows how long the oldest one has been waiting."
          footer={
            <span className="text-[11px] text-muted-foreground">
              {oldestOpen ? (
                <>
                  Oldest opened <TimeAgo iso={oldestOpen} />
                </>
              ) : (
                "Queue is empty"
              )}
            </span>
          }
        />
        <StatTile
          label="In progress"
          value={String(inProgressCount)}
          info="Tickets someone is working on, usually a vendor technician visiting the site."
          footer={
            <span className="text-[11px] text-muted-foreground">
              {unassignedOpen > 0 ? `${unassignedOpen} open without a vendor` : "Every open ticket has a vendor"}
            </span>
          }
        />
        <StatTile
          label="Resolved"
          value={String(resolvedCount)}
          info="Tickets that were fixed (resolved) or closed."
          footer={<span className="text-[11px] text-muted-foreground">of {tickets.length} tickets in total</span>}
        />
        <StatTile
          label="Urgent"
          value={String(urgentCount)}
          info="High or urgent priority tickets that are still open or in progress. These should be handled first."
          footer={
            urgentCount > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-red-700 dark:text-red-400">
                <AlertTriangle className="size-3" />
                Needs attention first
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Nothing urgent</span>
            )
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <StatusTabs
          label="Ticket status"
          tabs={[
            { value: "ALL", label: "All", count: tickets.length },
            { value: "OPEN", label: "Open", count: statusCounts.OPEN ?? 0 },
            { value: "IN_PROGRESS", label: "In progress", count: statusCounts.IN_PROGRESS ?? 0 },
            { value: "RESOLVED", label: "Resolved", count: statusCounts.RESOLVED ?? 0 },
            { value: "CLOSED", label: "Closed", count: statusCounts.CLOSED ?? 0 },
          ]}
          active={statusFilter}
          onChange={setStatusFilter}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search ticket #, title, customer or vendor..." />
          <select
            aria-label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 rounded-md border border-border/50 bg-card px-2.5 text-xs text-foreground/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Refreshing" />}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ticket ID</th>
                  <th className="px-4 py-2.5 font-medium">Issue Summary</th>
                  <th className="px-4 py-2.5 font-medium">Customer Site</th>
                  <th className="px-4 py-2.5 font-medium">Assigned Vendor</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Opened</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTickets.length === 0 && (
                  <EmptyTableRow
                    colSpan={8}
                    icon={Ticket}
                    title={tickets.length === 0 ? "No tickets yet" : "No matching tickets"}
                    hint={tickets.length === 0 ? "Create a ticket when a customer reports a problem." : "Try another tab, priority or search."}
                  />
                )}
                {filteredTickets.map((t) => {
                  const pBadge = priorityBadges[t.priority] || {
                    label: t.priority,
                    variant: "outline",
                  };
                  const sBadge = statusBadges[t.status] || {
                    label: t.status,
                    variant: "outline",
                  };
                  return (
                    <tr
                      key={t.id}
                      className="cursor-pointer transition-colors hover:bg-muted/20"
                      onClick={() => {
                        setSelectedTicket(t);
                        setDetailsOpen(true);
                      }}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium">
                        {t.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                        {t.title}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.customerAccount?.name || "Direct Customer"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.assignedVendor?.name || "Unassigned"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={pBadge.variant}>{pBadge.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={sBadge.variant}>{sBadge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        <TimeAgo iso={t.createdAt} />
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            title="Hardware Swap"
                            onClick={() => {
                              setSelectedTicket(t);
                              setRmaOpen(true);
                            }}
                          >
                            <ArrowLeftRight className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setSelectedTicket(t);
                              setDetailsOpen(true);
                            }}
                          >
                            Manage
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      </div>

      {/* Modals */}
      <CreateTicketModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        customers={customers}
        onSuccess={loadData}
      />

      <TicketDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        ticket={selectedTicket}
        onOpenRma={(ticket) => {
          setSelectedTicket(ticket);
          setRmaOpen(true);
        }}
        onSuccess={loadData}
      />

      <RmaSwapModal
        open={rmaOpen}
        onOpenChange={setRmaOpen}
        ticket={selectedTicket}
        customers={customers}
        devices={devices}
        onSuccess={loadData}
      />
    </div>
  );
}

export function TicketsPageClient({ initial }: { initial: TicketsInitialData }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <TicketsPageContent initial={initial} />
    </Suspense>
  );
}
