"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Store,
  HardDrive,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";
import {
  getVendorDetailsAction,
  verifyVendorAction,
} from "@/lib/actions/vendor.actions";
import type { VerificationStatus } from "@/lib/types";

export default function VendorFullProfilePage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params?.id as string;

  const [vendor, setVendor] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const [confirmStatus, setConfirmStatus] = React.useState<VerificationStatus | null>(null);
  const [activeTab, setActiveTab] = React.useState<"overview" | "custody" | "installed" | "customers">("overview");

  const fetchVendor = React.useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    const res = await getVendorDetailsAction(vendorId);
    if (res.success && res.data) {
      setVendor(res.data);
    } else {
      setError(res.error || "Failed to load vendor profile");
    }
    setLoading(false);
  }, [vendorId]);

  React.useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  async function handleVerify(status: VerificationStatus) {
    if (!vendorId) return;

    setVerifying(true);
    const res = await verifyVendorAction(vendorId, status);
    setVerifying(false);
    setConfirmStatus(null);

    if (res.success) {
      toast.success(
        status === "VERIFIED"
          ? "Vendor KYC approved successfully"
          : "Vendor KYC rejected"
      );
      fetchVendor();
    } else {
      toast.error(res.error || "Failed to update verification status");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Store className="h-10 w-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Vendor Not Found</h2>
        <p className="text-xs text-muted-foreground">{error || "The requested vendor could not be located."}</p>
        <Link
          href="/dashboard/vendors"
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Vendors
        </Link>
      </div>
    );
  }

  const profile = vendor.vendorProfile;
  const owner = vendor.owner;
  const bank = vendor.bankDetails?.[0];
  const custodianDevices = vendor.custodianDevices || [];
  const installedDevices = vendor.installedDevices || [];
  const managedCustomers = vendor.managedCustomers || [];

  const kycStatus = profile?.verificationStatus || "PENDING";
  const kycConfig = {
    VERIFIED: {
      label: "KYC Verified",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    PENDING: {
      label: "KYC Pending Review",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    REJECTED: {
      label: "KYC Rejected",
      className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    },
  }[kycStatus as "VERIFIED" | "PENDING" | "REJECTED"] || {
    label: kycStatus,
    className: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20",
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/vendors"
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Vendors
        </Link>

        {/* Quick Verification Actions */}
        {kycStatus === "PENDING" && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setConfirmStatus("VERIFIED")}
              disabled={verifying}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve KYC
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs gap-1.5"
              onClick={() => setConfirmStatus("REJECTED")}
              disabled={verifying}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Hero Header */}
      <Card className="border-border/60 bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Store className="h-6 w-6" />
            </span>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {profile?.companyName || vendor.name}
                </h1>
                {profile?.vendorCode && (
                  <Badge variant="outline" className="font-mono text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                    {profile.vendorCode}
                  </Badge>
                )}
                <Badge variant="outline" className={kycConfig.className}>
                  {kycConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {vendor.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Legal Entity: <span className="font-medium text-foreground">{profile?.legalName || profile?.companyName || vendor.name}</span>
                {profile?.panNumber && <> • PAN: <span className="font-mono text-foreground">{profile.panNumber}</span></>}
                {profile?.gstNumber && <> • GSTIN: <span className="font-mono text-foreground">{profile.gstNumber}</span></>}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Shelf Stock (Custody)</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {custodianDevices.length} <span className="text-xs font-normal text-muted-foreground">Units</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Unallocated consignment</p>
        </Card>

        <Card className="p-4 border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Installed Field Fleet</span>
            <HardDrive className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 text-emerald-600 dark:text-emerald-400">
            {installedDevices.length} <span className="text-xs font-normal text-muted-foreground">Units</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Operational at client sites</p>
        </Card>

        <Card className="p-4 border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Managed Stores</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {managedCustomers.length} <span className="text-xs font-normal text-muted-foreground">Stores</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Subscribed customers</p>
        </Card>

        <Card className="p-4 border-border/60 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Payout Bank Account</span>
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm font-semibold text-foreground mt-2 truncate">
            {bank?.bank_name || "Not Added"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {bank?.account_no ? `•••• ${bank.account_no.slice(-4)}` : "Awaiting details"}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/50">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "overview"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Company & Contact Details
        </button>
        <button
          onClick={() => setActiveTab("custody")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "custody"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Shelf Custody Stock ({custodianDevices.length})
        </button>
        <button
          onClick={() => setActiveTab("installed")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "installed"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Installed Field Devices ({installedDevices.length})
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "customers"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Managed Customer Stores ({managedCustomers.length})
        </button>
      </div>

      {/* Tab 1: Overview & Compliance */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/60 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              Tax & KYB Compliance
            </h3>
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">PAN Number</span>
                <span className="font-mono font-medium text-foreground">{profile?.panNumber || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">GSTIN</span>
                <span className="font-mono font-medium text-foreground">{profile?.gstNumber || "Not registered"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">KYC Verification Status</span>
                <Badge variant="outline" className={kycConfig.className}>
                  {kycConfig.label}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Registered Address</span>
                <span className="font-medium text-foreground">
                  {profile?.address || "No address provided"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Onboarded On</span>
                <span className="text-foreground">
                  {new Date(vendor.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          <Card className="border-border/60 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-primary" />
              Primary Contact & Banking
            </h3>
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Account Owner</span>
                <span className="font-medium text-foreground">{owner?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Email Address</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-foreground">{owner?.email || "N/A"}</span>
                  {owner?.emailVerified && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                </div>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Phone Number</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-foreground">{owner?.phoneNumber || "N/A"}</span>
                  {owner?.phoneNumberVerified && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                </div>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Bank Name</span>
                <span className="font-medium text-foreground">{bank?.bank_name || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Account Number</span>
                <span className="font-mono text-foreground">{bank?.account_no || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">IFSC Code</span>
                <span className="font-mono text-foreground">{bank?.ifsc || "N/A"}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Shelf Custody Stock */}
      {activeTab === "custody" && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Device ID</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Inventory Status</th>
                  <th className="px-4 py-3 font-semibold">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {custodianDevices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No devices currently in shelf custody.
                    </td>
                  </tr>
                ) : (
                  custodianDevices.map((d: any) => (
                    <tr key={d.device_id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        {d.device_id}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.model?.name || d.modelCode}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                          {d.inventory_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Installed Field Devices */}
      {activeTab === "installed" && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Device ID</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Customer Store</th>
                  <th className="px-4 py-3 font-semibold">Live State</th>
                  <th className="px-4 py-3 font-semibold">Installed Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {installedDevices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No devices installed in the field by this vendor.
                    </td>
                  </tr>
                ) : (
                  installedDevices.map((d: any) => {
                    const isOnline = d.runtimeState?.online;
                    return (
                      <tr key={d.device_id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          {d.device_id}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.model?.name || d.modelCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {d.ownerBusinessAccount?.name || "Direct Customer"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                              }`}
                            />
                            <span className="text-[11px] font-medium">
                              {isOnline ? "Online" : "Offline"}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                          {d.installation_address || "On-site"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Managed Customers */}
      {activeTab === "customers" && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Store Name</th>
                  <th className="px-4 py-3 font-semibold">Owner Contact</th>
                  <th className="px-4 py-3 font-semibold">Hardware Count</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Joined On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {managedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No customer stores currently managed by this vendor.
                    </td>
                  </tr>
                ) : (
                  managedCustomers.map((cp: any) => {
                    const c = cp.businessAccount;
                    if (!c) return null;
                    return (
                      <tr key={c.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="text-foreground">{c.owner?.name}</div>
                          <div className="text-[11px] font-mono">{c.owner?.email}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {c._count?.devices || 0} Units
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              c.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                            }
                          >
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Systematic Confirmation Modal for KYC Verification */}
      <ConfirmModal
        open={confirmStatus !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmStatus(null);
        }}
        title={confirmStatus === "VERIFIED" ? "Approve Vendor KYC" : "Reject Vendor KYC"}
        description={
          confirmStatus === "VERIFIED"
            ? `Are you sure you want to approve KYC for "${profile?.businessName || vendor?.name}"? They will be granted full access to receive and deploy hardware inventory.`
            : `Are you sure you want to reject KYC verification for "${profile?.businessName || vendor?.name}"? The vendor will need to submit rectified documentation.`
        }
        confirmText={confirmStatus === "VERIFIED" ? "Approve KYC" : "Reject KYC"}
        variant={confirmStatus === "VERIFIED" ? "default" : "destructive"}
        loading={verifying}
        onConfirm={() => {
          if (confirmStatus) {
            handleVerify(confirmStatus);
          }
        }}
      />
    </div>
  );
}
