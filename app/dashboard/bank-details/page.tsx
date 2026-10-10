"use client";

import { useEffect, useState } from "react";
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
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Loader2,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import {
  getBankDetailsAction,
  toggleBankDetailActiveAction,
} from "@/lib/actions/bank-detail.actions";
import { toast } from "sonner";
import type { BankDetailItem } from "@/lib/types";

export default function BankDetailsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getBankDetailsAction();
      if (res.success && res.data) {
        setBankAccounts(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (item: BankDetailItem) => {
    setTogglingId(item.id);
    const newStatus = !item.is_active;
    try {
      const res = await toggleBankDetailActiveAction(item.id, newStatus);
      if (!res.success) {
        toast.error(res.error || "Failed to update bank account status");
        return;
      }
      toast.success(
        newStatus
          ? "Bank account approved & activated for payouts"
          : "Bank account deactivated"
      );
      setBankAccounts((prev) =>
        prev.map((b) => (b.id === item.id ? { ...b, is_active: newStatus } : b))
      );
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredAccounts = bankAccounts.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const accountName = item.businessAccount?.name?.toLowerCase() || "";
    return (
      accountName.includes(q) ||
      item.bank_name.toLowerCase().includes(q) ||
      item.ifsc.toLowerCase().includes(q) ||
      item.account_no.toLowerCase().includes(q)
    );
  });

  const totalCount = bankAccounts.length;
  const activeCount = bankAccounts.filter((b) => b.is_active).length;
  const pendingCount = totalCount - activeCount;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Bank & Payout Accounts
          </h1>
          <p className="text-xs text-muted-foreground">
            Review and approve vendor and customer bank accounts for payouts and settlements
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Registered Accounts
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                total
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                submitted bank profiles
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Approved & Active
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                verified
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {activeCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                ready for disbursement
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Pending Approval
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
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {pendingCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                verification needed
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search entity, bank, IFSC, account #..."
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
      </div>

      {/* Bank Details Table */}
      <div className="overflow-hidden border border-border/50 bg-card shadow-none">
        <div className="border-b border-border/40 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Bank Accounts ({filteredAccounts.length})
          </span>
        </div>
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-full rounded" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
            <Banknote className="size-8 mb-2 stroke-1 opacity-40" />
            <p className="text-sm font-medium">No bank accounts registered</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Bank accounts submitted by vendors will appear here for verification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Beneficiary Entity</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Bank & Branch</th>
                  <th className="px-4 py-2.5 font-medium">Account Number</th>
                  <th className="px-4 py-2.5 font-medium">IFSC Code</th>
                  <th className="px-4 py-2.5 font-medium">Approval Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredAccounts.map((item) => {
                  const isProcessing = togglingId === item.id;
                  const entityName = item.businessAccount?.name || "Direct Account";
                  const accountType = item.businessAccount?.accountType || "VENDOR";

                  return (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {entityName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {accountType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{item.bank_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.branch_name || "Main Branch"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        {item.account_no}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        {item.ifsc}
                      </td>
                      <td className="px-4 py-3">
                        {item.is_active ? (
                          <Badge variant="success">
                            Active & Verified
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            Pending Approval
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={item.is_active ? "outline" : "default"}
                          size="sm"
                          className="h-8 text-xs"
                          disabled={isProcessing}
                          onClick={() => handleToggleStatus(item)}
                        >
                          {isProcessing ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : item.is_active ? (
                            <X className="mr-1.5 size-3.5 text-rose-500" />
                          ) : (
                            <Check className="mr-1.5 size-3.5" />
                          )}
                          {item.is_active ? "Deactivate" : "Approve"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
