import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * The one card surface used across the dashboard (tiles, panels, tables, skeletons).
 * Keep every card on this so sizes, corners and borders match from page to page.
 */
export const SURFACE = "rounded-lg border border-border/60 bg-card";

/** Header shared by the detail pages (event, device, customer): breadcrumb, title + badges, meta line, actions. */
export function DetailHeader({
  back,
  crumb,
  title,
  mono = false,
  badges,
  meta,
  actions,
}: {
  back: { href: string; label: string };
  /** Last breadcrumb segment; defaults to the title. */
  crumb?: string;
  title: React.ReactNode;
  mono?: boolean;
  badges?: React.ReactNode;
  /** Short facts under the title, separated by dots. Falsy entries are skipped. */
  meta?: React.ReactNode[];
  actions?: React.ReactNode;
}) {
  const metaItems = (meta ?? []).filter(Boolean);
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <nav className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href={back.href} className="flex shrink-0 items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3" />
            {back.label}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground">{crumb ?? title}</span>
        </nav>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className={`truncate text-lg font-semibold tracking-tight text-foreground ${mono ? "font-mono" : ""}`}>{title}</h1>
          {badges}
        </div>
        {metaItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {metaItems.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span aria-hidden="true" className="text-muted-foreground/40">·</span>}
                <span className="flex min-w-0 items-center gap-1">{m}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export interface Fact {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

/** Label / value rows inside a panel. Empty values show "—" rather than invented defaults. */
export function Facts({ items, className = "" }: { items: Fact[]; className?: string }) {
  return (
    <dl className={`divide-y divide-border/40 text-xs ${className}`}>
      {items.map((f) => (
        <div key={f.label} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
          <dd className={`min-w-0 truncate text-right text-foreground ${f.mono ? "font-mono text-[11px]" : ""}`}>
            {f.value === null || f.value === undefined || f.value === "" ? "—" : f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Table header styling shared with the list pages. */
export const THEAD = "border-b border-border/40 bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground";
export const TH = "px-4 py-2.5 font-medium";
