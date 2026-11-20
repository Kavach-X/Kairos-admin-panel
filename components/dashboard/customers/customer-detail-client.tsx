"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, Calendar, CheckCircle2, HardDrive, Loader2, Mail, Phone, RefreshCw, Ticket, User, Video } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { getCustomerByIdAction, updateCustomerStatusAction, reassignCustomerVendorAction } from "@/lib/actions/customer.actions";
import { getVendorsListAction } from "@/lib/actions/device.actions";
import type { CustomerDetail } from "@/lib/types";
import { StatusTabs, EmptyTableRow } from "@/components/dashboard/list-page";
import { StatTile } from "@/components/dashboard/stat-tile";
import { CardShell } from "@/components/dashboard/analytics/viz";
import { DetailHeader, Facts, SURFACE, TH, THEAD } from "@/components/dashboard/detail-header";
import { statusBadgeStyles } from "@/components/dashboard/devices/device-status";
import { TimeAgo } from "@/components/dashboard/overview/time-ago";

// Fixed locale and zone so the server render and the browser agree.
const DATE = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

type Tab = "devices" | "cameras" | "tickets" | "account";

export interface CustomerDetailInitial {
  customer: CustomerDetail | null;
  error: string | null;
}

function Verified({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="inline size-3.5 text-emerald-500" aria-label="Verified" />
  ) : (
    <span className="text-[10px] text-muted-foreground">unverified</span>
  );
}

export function CustomerDetailClient({ initial }: { initial: CustomerDetailInitial }) {
  const router = useRouter();
  const [customer, setCustomer] = React.useState<CustomerDetail | null>(initial.customer);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [confirmStatusModal, setConfirmStatusModal] = React.useState(false);
  const [isReassigning, setIsReassigning] = React.useState(false);
  // Vendors are only needed to change the servicing vendor, so they load when that is opened.
  const [vendors, setVendors] = React.useState<Array<{ id: string; name: string; vendorCode?: string }> | null>(null);

  const startReassign = async () => {
    setIsReassigning(true);
    if (vendors) return;
    const res = await getVendorsListAction();
    if (res.success && res.data) setVendors(res.data);
    else {
      toast.error(res.error || "Couldn't load vendors");
      setIsReassigning(false);
    }
  };
  const [selectedVendorId, setSelectedVendorId] = React.useState(initial.customer?.profile?.managedByVendor?.id ?? "");
  const [activeTab, setActiveTab] = React.useState<Tab>("devices");

  // Refresh keeps the page in place: the button spins, the content swaps when the new data lands.
  const refresh = React.useCallback(async () => {
    if (!customer) return;
    setRefreshing(true);
    const res = await getCustomerByIdAction(customer.id);
    if (res.success && res.data) {
      setCustomer(res.data);
      setSelectedVendorId(res.data.profile?.managedByVendor?.id ?? "");
    } else {
      toast.error(res.error || "Couldn't refresh this customer");
    }
    setRefreshing(false);
  }, [customer]);

  if (!customer) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="mb-3 size-8 text-amber-500" />
        <h2 className="text-base font-semibold text-foreground">Customer not found</h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">{initial.error || "This customer could not be loaded."}</p>
        <Link href="/dashboard/customers" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <ArrowLeft className="size-3.5" />
          Back to customers
        </Link>
      </div>
    );
  }

  const handleToggleStatus = async () => {
    const newStatus = customer.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoading(true);
    try {
      const res = await updateCustomerStatusAction(customer.id, newStatus);
      if (res.success) {
        toast.success(newStatus === "ACTIVE" ? "Account activated" : "Account suspended");
        setCustomer((prev) => (prev ? { ...prev, status: newStatus } : null));
        setConfirmStatusModal(false);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveVendorReassign = async () => {
    if (!selectedVendorId) return;
    setActionLoading(true);
    try {
      const res = await reassignCustomerVendorAction(customer.id, selectedVendorId);
      if (res.success) {
        toast.success("Servicing vendor changed");
        setIsReassigning(false);
        refresh();
      } else {
        toast.error(res.error || "Failed to change the vendor");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const isActive = customer.status === "ACTIVE";
  const stats = customer.stats;
  const cameras = customer.devices.flatMap((d) => (d.cameras || []).map((c) => ({ ...c, device: d })));
  const openDevice = (id: string) => router.push(`/dashboard/devices/${encodeURIComponent(id)}`);

  return (
    <div className="flex flex-col gap-5">
      <DetailHeader
        back={{ href: "/dashboard/customers", label: "Customers" }}
        title={customer.name}
        badges={
          <Badge variant={isActive ? "success" : "destructive"} className="px-1.5 py-0 text-[10px]">
            {isActive ? "Active" : customer.status.charAt(0) + customer.status.slice(1).toLowerCase()}
          </Badge>
        }
        meta={[
          <>
            <User className="size-3" />
            {customer.owner.name}
          </>,
          customer.owner.email && (
            <>
              <Mail className="size-3" />
              {customer.owner.email}
            </>
          ),
          customer.owner.phoneNumber && (
            <>
              <Phone className="size-3" />
              {customer.owner.phoneNumber}
            </>
          ),
          <>
            <Calendar className="size-3" />
            Joined {DATE.format(new Date(customer.createdAt))}
          </>,
        ]}
        actions={
          <>
            <Link
              href={`/dashboard/activity?customer=${encodeURIComponent(customer.id)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 text-xs")}
            >
              <Activity className="size-3.5" />
              View events
            </Link>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmStatusModal(true)}
              className={cn(
                "h-8 text-xs",
                isActive
                  ? "border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                  : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              )}
            >
              {isActive ? "Suspend account" : "Activate account"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Edge boxes installed"
          value={String(stats.installedBoxes)}
          note={`${stats.onlineBoxes} online`}
          info="Boxes installed at this customer's site, and how many are connected right now."
        />
        <StatTile
          label="Waiting for install"
          value={String(stats.assignedBoxes)}
          info="Boxes assigned to this customer that a technician has not installed yet."
        />
        <StatTile label="Cameras" value={String(stats.totalCameras)} info="Camera feeds connected to this customer's edge boxes." />
        <StatTile
          label="Open tickets"
          value={String(stats.openTickets)}
          note={`of ${stats.totalTickets}`}
          info="Support tickets still open, out of all tickets this customer has raised."
        />
      </div>

      <StatusTabs<Tab>
        label="Customer sections"
        tabs={[
          { value: "devices", label: "Edge boxes", count: customer.devices.length },
          { value: "cameras", label: "Cameras", count: cameras.length },
          { value: "tickets", label: "Tickets", count: customer.tickets.length },
          { value: "account", label: "Account & vendor" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "devices" && (
        <div className={`${SURFACE} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Device ID</th>
                  <th className={TH}>Model</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Last seen</th>
                  <th className={`${TH} text-right`}>Cameras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {customer.devices.length === 0 ? (
                  <EmptyTableRow colSpan={5} icon={HardDrive} title="No edge boxes yet" hint="Assign a box from the Devices page." />
                ) : (
                  customer.devices.map((dev) => {
                    const status = statusBadgeStyles[dev.inventory_status] ?? { label: dev.inventory_status, className: "" };
                    return (
                      <tr key={dev.device_id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => openDevice(dev.device_id)}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/devices/${encodeURIComponent(dev.device_id)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 font-mono font-medium text-foreground hover:text-primary"
                          >
                            <span className={`size-1.5 shrink-0 rounded-full ${dev.online ? "bg-emerald-500" : "bg-zinc-400"}`} />
                            {dev.device_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-foreground">{dev.model?.name || dev.modelCode}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${status.className}`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {dev.online ? "Online now" : <TimeAgo iso={dev.runtimeState?.last_seen_at ?? null} fallback="Never" />}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">{(dev.cameras || []).length}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "cameras" && (
        <div className={`${SURFACE} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Camera</th>
                  <th className={TH}>Edge box</th>
                  <th className={TH}>Address</th>
                  <th className={TH}>Stream</th>
                  <th className={TH}>Detects</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {cameras.length === 0 ? (
                  <EmptyTableRow colSpan={6} icon={Video} title="No cameras yet" hint="Cameras appear once they are added on an edge box." />
                ) : (
                  cameras.map((cam) => (
                    <CameraRow key={cam.id} cam={cam} deviceId={cam.device.device_id} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "tickets" && (
        <div className={`${SURFACE} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Ticket</th>
                  <th className={TH}>Priority</th>
                  <th className={TH}>Vendor</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} text-right`}>Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {customer.tickets.length === 0 ? (
                  <EmptyTableRow colSpan={5} icon={Ticket} title="No tickets" hint="This customer has not raised any support tickets." />
                ) : (
                  customer.tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => router.push(`/dashboard/tickets?selected=${t.id}`)}
                    >
                      <td className="max-w-md px-4 py-3">
                        <span className="block truncate font-medium text-foreground">{t.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{t.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={t.priority === "URGENT" || t.priority === "HIGH" ? "destructive" : "outline"}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {t.priority.charAt(0) + t.priority.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{t.assignedVendor?.name || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {t.status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        <TimeAgo iso={t.createdAt} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <CardShell title="Owner">
            <Facts
              items={[
                { label: "Name", value: customer.owner.name },
                {
                  label: "Email",
                  value: customer.owner.email && (
                    <span className="flex items-center justify-end gap-1.5">
                      {customer.owner.email}
                      <Verified ok={Boolean(customer.owner.emailVerified)} />
                    </span>
                  ),
                },
                {
                  label: "Phone",
                  value: customer.owner.phoneNumber && (
                    <span className="flex items-center justify-end gap-1.5 font-mono">
                      {customer.owner.phoneNumber}
                      <Verified ok={Boolean(customer.owner.phoneNumberVerified)} />
                    </span>
                  ),
                },
                { label: "Account created", value: DATE.format(new Date(customer.createdAt)) },
              ]}
            />
          </CardShell>

          <CardShell title="Vendor">
            <Facts
              items={[
                { label: "Brought in by", value: customer.profile?.acquiredByVendor?.name || "Direct" },
                { label: "Servicing vendor", value: customer.profile?.managedByVendor?.name || "Kairos (no vendor)" },
              ]}
            />
            <div className="mt-4 border-t border-border/40 pt-4">
              {isReassigning ? (
                <div className="space-y-2">
                  <SearchableSelect
                    options={(vendors ?? []).map((v) => ({ value: v.id, label: `${v.name}${v.vendorCode ? ` (${v.vendorCode})` : ""}` }))}
                    value={selectedVendorId}
                    onValueChange={setSelectedVendorId}
                    placeholder={vendors ? "Search vendors..." : "Loading vendors..."}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 text-xs" disabled={!selectedVendorId || actionLoading} onClick={handleSaveVendorReassign}>
                      {actionLoading && <Loader2 className="mr-1 size-3 animate-spin" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsReassigning(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-8 w-full text-xs" onClick={startReassign}>
                  Change servicing vendor
                </Button>
              )}
            </div>
          </CardShell>
        </div>
      )}

      <ConfirmModal
        open={confirmStatusModal}
        onOpenChange={setConfirmStatusModal}
        title={isActive ? "Suspend customer account" : "Activate customer account"}
        description={
          isActive
            ? `Suspend "${customer.name}"? Video upload and alerts for their cameras will pause.`
            : `Activate "${customer.name}"? Video upload and alerts for their cameras will resume.`
        }
        variant={isActive ? "destructive" : "default"}
        loading={actionLoading}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}

type CameraItem = NonNullable<CustomerDetail["devices"][number]["cameras"]>[number];

/** One camera row; shared shape with the device page's camera table. */
export function CameraRow({ cam, deviceId }: { cam: CameraItem; deviceId?: string }) {
  const active = cam.status === "ACTIVE";
  const stream = [cam.resolution, cam.fpsLimit ? `${cam.fpsLimit} fps` : null].filter(Boolean).join(" · ");
  return (
    <tr>
      <td className="px-4 py-3">
        <span className="mr-2 rounded border border-border/60 px-1 font-mono text-[10px] text-muted-foreground">CH {cam.channelNumber}</span>
        <span className="font-medium text-foreground">{cam.name}</span>
      </td>
      {deviceId !== undefined && (
        <td className="px-4 py-3">
          <Link href={`/dashboard/devices/${encodeURIComponent(deviceId)}`} className="font-mono text-foreground hover:text-primary hover:underline">
            {deviceId}
          </Link>
        </td>
      )}
      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground" title={cam.rtspPath || undefined}>
        {cam.ipAddress ? `${cam.ipAddress}${cam.port ? `:${cam.port}` : ""}` : "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{stream || "—"}</td>
      <td className="px-4 py-3">
        {cam.aiTasks?.length ? (
          <span className="flex flex-wrap gap-1">
            {cam.aiTasks.map((task) => (
              <span key={task} className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                {task.toLowerCase()}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-foreground">
          <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-zinc-400"}`} />
          {active ? "Active" : cam.status.charAt(0) + cam.status.slice(1).toLowerCase()}
        </span>
      </td>
    </tr>
  );
}
