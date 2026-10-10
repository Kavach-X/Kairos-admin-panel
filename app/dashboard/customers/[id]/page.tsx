"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  HardDrive,
  Video,
  Ticket,
  Store,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Plus,
  Loader2,
  Package,
  Activity,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getCustomerByIdAction,
  updateCustomerStatusAction,
  reassignCustomerVendorAction,
} from "@/lib/actions/customer.actions";
import { getVendorsListAction } from "@/lib/actions/device.actions";
import type { CustomerDetail } from "@/lib/types";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [customer, setCustomer] = React.useState<CustomerDetail | null>(null);
  const [vendors, setVendors] = React.useState<
    Array<{ id: string; name: string; vendorCode?: string }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [confirmStatusModal, setConfirmStatusModal] = React.useState(false);

  // Vendor reassign state
  const [isReassigning, setIsReassigning] = React.useState(false);
  const [selectedVendorId, setSelectedVendorId] = React.useState("");

  // Tab state
  const [activeTab, setActiveTab] = React.useState<
    "devices" | "cameras" | "tickets" | "overview"
  >("devices");

  const loadCustomer = React.useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const [res, vendorsRes] = await Promise.all([
        getCustomerByIdAction(customerId),
        getVendorsListAction(),
      ]);

      if (res.success && res.data) {
        setCustomer(res.data);
        if (res.data.profile?.managedByVendor?.id) {
          setSelectedVendorId(res.data.profile.managedByVendor.id);
        }
      } else {
        setError(res.error || "Customer account not found");
      }

      if (vendorsRes.success && vendorsRes.data) {
        setVendors(vendorsRes.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load customer profile");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const handleToggleStatus = async () => {
    if (!customer) return;
    const newStatus = customer.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoading(true);
    try {
      const res = await updateCustomerStatusAction(customer.id, newStatus);
      if (res.success) {
        toast.success(`Account marked as ${newStatus}`);
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
    if (!customer || !selectedVendorId) return;
    setActionLoading(true);
    try {
      const res = await reassignCustomerVendorAction(customer.id, selectedVendorId);
      if (res.success) {
        toast.success("Managing vendor successfully reassigned");
        setIsReassigning(false);
        loadCustomer();
      } else {
        toast.error(res.error || "Failed to reassign vendor");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-1 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-lg mx-auto">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-foreground">Customer Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">{error || "Unable to retrieve details."}</p>
        <Link
          href="/dashboard/customers"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Customers
        </Link>
      </div>
    );
  }

  const isActive = customer.status === "ACTIVE";
  const allCameras = customer.devices.flatMap((d) =>
    (d.cameras || []).map((c) => ({
      ...c,
      parentDevice: d,
    }))
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/dashboard/customers"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Customers
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{customer.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {customer.name}
            </h1>
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
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Owner: <strong className="text-foreground font-normal">{customer.owner.name}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {customer.owner.email}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {new Date(customer.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCustomer}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button
            variant={isActive ? "outline" : "default"}
            size="sm"
            onClick={() => setConfirmStatusModal(true)}
            className={`gap-1.5 h-8 text-xs ${
              isActive
                ? "text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isActive ? "Suspend Account" : "Activate Account"}
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Installed EdgeBoxes</span>
            <HardDrive className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 text-emerald-600 dark:text-emerald-400">
            {customer.stats.installedBoxes} Units
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {customer.stats.onlineBoxes} active & streaming online
          </span>
        </Card>

        <Card className="p-4 border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Assigned / Standby</span>
            <Package className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 text-amber-600 dark:text-amber-400">
            {customer.stats.assignedBoxes} Units
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Awaiting field technician installation
          </span>
        </Card>

        <Card className="p-4 border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Connected CCTV Cameras</span>
            <Video className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {customer.stats.totalCameras} Feeds
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Real-time RTSP AI analytics channels
          </span>
        </Card>

        <Card className="p-4 border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Support Tickets</span>
            <Ticket className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 text-blue-600 dark:text-blue-400">
            {customer.stats.openTickets} Open
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {customer.stats.totalTickets} lifetime requests
          </span>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1">
        <button
          onClick={() => setActiveTab("devices")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "devices"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <HardDrive className="h-3.5 w-3.5" />
          Edge Devices Fleet ({customer.devices.length})
        </button>

        <button
          onClick={() => setActiveTab("cameras")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "cameras"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          CCTV Streams & Feeds ({allCameras.length})
        </button>

        <button
          onClick={() => setActiveTab("tickets")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "tickets"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Ticket className="h-3.5 w-3.5" />
          Support & RMA Tickets ({customer.tickets.length})
        </button>

        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Account & Vendor Profile
        </button>
      </div>

      {/* Tab 1: Edge Devices Fleet */}
      {activeTab === "devices" && (
        <Card className="border-border/60 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Deployed Edge Fleet</h3>
              <p className="text-xs text-muted-foreground">
                Hardware boxes owned by and installed at this store
              </p>
            </div>
            <Link
              href="/dashboard/devices"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs gap-1")}
            >
              <Plus className="h-3 w-3" />
              Fleet Manager
            </Link>
          </div>

          {customer.devices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No edge devices deployed or assigned to this customer yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3">Device ID</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Ethernet MAC</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">CCTV Feeds</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {customer.devices.map((dev) => (
                    <tr
                      key={dev.device_id}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/dashboard/devices?selected=${dev.device_id}`, { scroll: true })}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                              dev.online ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                            }`}
                          />
                          <span className="font-mono font-semibold text-foreground">
                            {dev.device_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">
                        {dev.model?.name || dev.modelCode}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {dev.eth_mac}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            dev.inventory_status === "INSTALLED"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : dev.inventory_status === "ASSIGNED"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {dev.inventory_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Video className="h-3 w-3 text-primary" />
                          <span>{(dev.cameras || []).length} Channels</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/devices?selected=${dev.device_id}`}
                          scroll={true}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-7 px-2.5 text-xs text-primary gap-1 inline-flex"
                          )}
                        >
                          <span>View Device</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: CCTV Streams & Feeds */}
      {activeTab === "cameras" && (
        <Card className="border-border/60 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/40">
            <h3 className="font-semibold text-foreground text-sm">
              Connected IP Camera Streams ({allCameras.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              All CCTV channels attached to EdgeBoxes across this customer store
            </p>
          </div>

          {allCameras.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No CCTV cameras attached to this store fleet yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {allCameras.map((cam) => {
                const isOnline = cam.status === "ACTIVE";
                return (
                  <div
                    key={cam.id}
                    className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] font-bold px-1.5 py-0 border-primary/30 text-primary"
                        >
                          CH {cam.channelNumber}
                        </Badge>
                        <span className="font-semibold text-foreground text-xs">
                          {cam.name}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          isOnline
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px]"
                        }
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                            isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          }`}
                        />
                        {cam.status}
                      </Badge>
                    </div>

                    <div className="text-[11px] font-mono text-muted-foreground space-y-1 pt-1 border-t border-border/40">
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">EdgeBox Host:</span>
                        <Link
                          href={`/dashboard/devices?selected=${cam.parentDevice.device_id}`}
                          scroll={true}
                          className="text-primary hover:underline font-mono"
                        >
                          {cam.parentDevice.device_id}
                        </Link>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">LAN Endpoint:</span>
                        <span className="text-foreground">{cam.ipAddress}:{cam.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">Stream Profile:</span>
                        <span className="text-foreground">{cam.resolution || "1080p"} @ {cam.fpsLimit || 15}fps</span>
                      </div>
                    </div>

                    {cam.rtspPath && (
                      <div className="text-[10px] font-mono bg-muted/40 px-2 py-1 rounded truncate text-muted-foreground">
                        <span className="text-foreground/70">Path:</span> {cam.rtspPath}
                      </div>
                    )}

                    {cam.aiTasks && cam.aiTasks.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {cam.aiTasks.map((task) => (
                          <Badge
                            key={task}
                            variant="secondary"
                            className="text-[9px] font-mono px-1.5 py-0 uppercase"
                          >
                            {task}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Support & RMA Tickets */}
      {activeTab === "tickets" && (
        <Card className="border-border/60 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Customer Support Tickets</h3>
              <p className="text-xs text-muted-foreground">
                Issue logs, triage requests, and hardware RMA hot-swap records
              </p>
            </div>
            <Link
              href="/dashboard/tickets"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs gap-1")}
            >
              <Ticket className="h-3 w-3" />
              All Tickets
            </Link>
          </div>

          {customer.tickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              <Ticket className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No support tickets raised for this customer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Subject / Issue</th>
                    <th className="px-4 py-3">Servicing Partner</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {customer.tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/dashboard/tickets?selected=${t.id}`)}
                    >
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            t.priority === "URGENT" || t.priority === "HIGH"
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground block">{t.title}</span>
                        <span className="text-muted-foreground text-[11px] truncate block max-w-sm">
                          {t.description}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {t.assignedVendor?.name || "Kairos Central Support"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{t.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/tickets?selected=${t.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-7 px-2.5 text-xs text-primary gap-1 inline-flex"
                          )}
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Overview & Partner Configuration */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Owner Profile Card */}
          <Card className="border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Account Owner Profile
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Full Name:</span>
                <span className="font-medium text-foreground">{customer.owner.name}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-foreground flex items-center gap-1.5">
                  {customer.owner.email}
                  {customer.owner.emailVerified ? (
                    <span title="Verified">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">(unverified)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Mobile Phone:</span>
                <span className="font-mono text-foreground flex items-center gap-1.5">
                  {customer.owner.phoneNumber || "N/A"}
                  {customer.owner.phoneNumber && (
                    customer.owner.phoneNumberVerified ? (
                      <span title="Verified">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">(unverified)</span>
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Created:</span>
                <span className="text-foreground">
                  {new Date(customer.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Vendor Partner Relationship */}
          <Card className="border-border/60 bg-card p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Managing Vendor Partner
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Acquired By:</span>
                  <span className="font-medium text-foreground">
                    {customer.profile?.acquiredByVendor?.name || "Direct / Kairos Central"}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Current Servicing Vendor:</span>
                  <span className="font-medium text-foreground">
                    {customer.profile?.managedByVendor?.name || "Direct (Kairos Internal)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/40">
              {isReassigning ? (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-foreground block">
                    Select New Vendor Partner:
                  </span>
                  <SearchableSelect
                    options={vendors.map((v) => ({
                      value: v.id,
                      label: `${v.name}${v.vendorCode ? ` (${v.vendorCode})` : ""}`,
                    }))}
                    value={selectedVendorId}
                    onValueChange={setSelectedVendorId}
                    placeholder="Search vendor partner..."
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="text-xs h-8"
                      disabled={!selectedVendorId || actionLoading}
                      onClick={handleSaveVendorReassign}
                    >
                      {actionLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Save Reassignment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
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
                  className="w-full text-xs h-8 gap-1.5"
                  onClick={() => setIsReassigning(true)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reassign Servicing Vendor Partner
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation Modal for Suspend/Activate */}
      <ConfirmModal
        open={confirmStatusModal}
        onOpenChange={setConfirmStatusModal}
        title={isActive ? "Suspend Customer Account" : "Activate Customer Account"}
        description={
          isActive
            ? `Are you sure you want to suspend "${customer.name}"? Cloud video ingestion and camera analytics alerts will be paused.`
            : `Are you sure you want to activate "${customer.name}"? This restores standard cloud operations.`
        }
        variant={isActive ? "destructive" : "default"}
        loading={actionLoading}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
