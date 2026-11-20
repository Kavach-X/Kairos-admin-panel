"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Building blocks shared by the list pages (devices, vendors, customers, tickets, models). */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Underlined status tabs with counts (same look as the events page). The underline is an inset
 * shadow so horizontal scrolling on narrow screens never adds a vertical scrollbar.
 */
export function StatusTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: Array<TabItem<T>>;
  active: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      className="flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]"
      role="tablist"
      aria-label={label}
    >
      {tabs.map((t) => {
        const selected = t.value === active;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.value)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors ${
              selected ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`rounded-full px-1.5 font-mono text-[10px] ${
                  selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {t.count.toLocaleString("en-IN")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className = "w-full sm:w-72",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
        }}
        className="h-8 border-border/50 bg-card pl-8 pr-8 text-xs shadow-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Table row shown when a list (or its filtered view) is empty. */
export function EmptyTableRow({
  colSpan,
  icon: Icon,
  title,
  hint,
}: {
  colSpan: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <Icon className="mx-auto mb-2 size-8 stroke-1 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </td>
    </tr>
  );
}

/** Counts per value of `key`, for tab badges. */
export function countBy<T>(items: T[], key: (item: T) => string | null | undefined) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
