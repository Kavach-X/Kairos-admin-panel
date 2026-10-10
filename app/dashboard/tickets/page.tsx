"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Plus,
  Ticket,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowLeftRight,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
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

function TicketsPageContent() {
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("selected");

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
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
        getTicketsAction({
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
          search: search.trim() || undefined,
        }),
        getCustomersAction(),
        getDevicesAction(),
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

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Filter in memory for instantaneous search speed
  const filteredTickets = tickets.filter((t) => {
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
  const urgentCount = tickets.filter(
    (t) => (t.priority === "URGENT" || t.priority === "HIGH") && t.status !== "RESOLVED"
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Support & RMA Tickets
          </h1>
          <p className="text-xs text-muted-foreground">
            Customer issue tickets, hardware fault reports, and technician assignments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5"
            onClick={() => {
              setSelectedTicket(null);
              setRmaOpen(true);
            }}
          >
            <ArrowLeftRight className="size-3.5 text-amber-500" />
            Hardware Swap (RMA)
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs font-normal gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Open Tickets
              </span>
              <span
                className={`font-mono text-[11px] font-medium ${
                  openCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {openCount > 0 ? `${openCount} pending` : "all clear"}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {openCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                triage queue
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                In Progress
              </span>
              <span className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400">
                assigned
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {inProgressCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                active field work
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Resolved
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                completed
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {resolvedCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                closed issues
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Urgent Priority
              </span>
              <span
                className={`font-mono text-[11px] font-medium ${
                  urgentCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {urgentCount > 0 ? `${urgentCount} urgent` : "none"}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {urgentCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                critical escalations
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ticket #, title, customer site..."
            className="h-8 pl-8 pr-8 text-xs border-border/50 bg-card shadow-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs text-foreground/90 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs text-foreground/90 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-hidden border border-border/50 bg-card shadow-none">
        <div className="border-b border-border/40 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            All Tickets ({filteredTickets.length})
          </span>
        </div>
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-full rounded" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
            <Ticket className="size-8 mb-2 stroke-1 opacity-40" />
            <p className="text-sm font-medium">No tickets found</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Create a new ticket or adjust your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ticket ID</th>
                  <th className="px-4 py-2.5 font-medium">Issue Summary</th>
                  <th className="px-4 py-2.5 font-medium">Customer Site</th>
                  <th className="px-4 py-2.5 font-medium">Assigned Vendor</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
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
                    <tr key={t.id} className="hover:bg-muted/20">
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
                      <td className="px-4 py-3 text-right">
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
        )}
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

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <TicketsPageContent />
    </Suspense>
  );
}
