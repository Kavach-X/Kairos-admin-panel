export const statusBadgeStyles: Record<string, { label: string; className: string }> = {
  IN_STOCK: {
    label: "In Stock",
    className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  WITH_VENDOR: {
    label: "With Vendor",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  ASSIGNED: {
    label: "Assigned",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  INSTALLED: {
    label: "Installed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  MAINTENANCE: {
    label: "Maintenance",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  RETURNED: {
    label: "Returned",
    className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  DECOMMISSIONED: {
    label: "Decommissioned",
    className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  },
};
