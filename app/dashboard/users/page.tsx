"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  X,
} from "lucide-react";
import { getUsersAction, deleteUserAction } from "@/lib/actions/user.actions";
import { CreateAdminModal } from "@/components/dashboard/users/create-admin-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import type { AdminUserItem } from "@/lib/types";

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUserItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getUsersAction();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteUser = async (user: AdminUserItem) => {
    setDeletingId(user.id);
    try {
      const res = await deleteUserAction(user.id);
      if (!res.success) {
        toast.error(res.error || "Failed to remove team member");
        return;
      }
      toast.success("Team member removed successfully");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      toast.error("Network error removing team member");
    } finally {
      setDeletingId(null);
      setConfirmDeleteUser(null);
    }
  };

  // Internal team members: all users belonging to the INTERNAL platform account
  const teamMembers = users.filter((u) => {
    return u.memberships?.some(
      (m: any) =>
        m.businessAccount?.accountType === "INTERNAL" ||
        m.roleCode === "SUPER_ADMIN" ||
        m.roleDefinition?.code === "SUPER_ADMIN"
    );
  });

  const filteredTeam = teamMembers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phoneNumber && u.phoneNumber.includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Internal Team & Access
          </h1>
          <p className="text-xs text-muted-foreground">
            Team members, role-based permissions, and console access for the Kairos platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs font-normal gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            Add Team Member
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search team member by name or email..."
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

      {/* Team Table Card */}
      <div className="overflow-hidden border border-border/50 bg-card shadow-none">
        <div className="border-b border-border/40 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Team Members ({loading ? "..." : filteredTeam.length})
          </span>
        </div>
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-full rounded" />
          </div>
        ) : filteredTeam.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
            <ShieldCheck className="size-8 mb-2 stroke-1 opacity-40" />
            <p className="text-sm font-medium">No team members found</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Add a team member to grant console access.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium">Email Status</th>
                  <th className="px-4 py-2.5 font-medium">Created On</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTeam.map((user) => {
                  const isDeleting = deletingId === user.id;
                  const roleCode =
                    user.memberships?.[0]?.roleCode ||
                    (user.memberships?.[0] as any)?.roleDefinition?.code ||
                    "SUPER_ADMIN";
                  const roleLabel = roleCode
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (c: string) => c.toUpperCase());
                  const isSuperAdmin = roleCode === "SUPER_ADMIN";
                  const isSelf = session?.user?.id === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{user.name}</p>
                              {isSelf && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            isSuperAdmin
                              ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
                              : "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 font-medium"
                          }
                        >
                          {roleLabel}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {user.phoneNumber ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3" />
                            {user.phoneNumber}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/50">No phone</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {user.emailVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <AlertCircle className="size-3.5 text-amber-500" />
                            Pending Verification
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                          disabled={isDeleting || isSelf}
                          onClick={() => setConfirmDeleteUser(user)}
                          title={isSelf ? "You cannot remove your own account" : "Remove Administrator"}
                        >
                          {isDeleting ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
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

      <CreateAdminModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={loadData}
      />

      <ConfirmModal
        open={Boolean(confirmDeleteUser)}
        onOpenChange={(open) => !open && setConfirmDeleteUser(null)}
        title="Remove Team Member"
        description={
          confirmDeleteUser ? (
            <span>
              Are you sure you want to remove administrator{" "}
              <strong className="text-foreground">{confirmDeleteUser.name}</strong> (
              <span className="font-mono">{confirmDeleteUser.email}</span>)? Their console access and internal account membership will be revoked.
            </span>
          ) : ""
        }
        confirmText="Remove Member"
        variant="destructive"
        loading={Boolean(deletingId)}
        onConfirm={() => {
          if (confirmDeleteUser) handleDeleteUser(confirmDeleteUser);
        }}
      />
    </div>
  );
}
