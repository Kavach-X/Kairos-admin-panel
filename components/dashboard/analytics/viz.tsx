"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EventOutcomeCounts } from "@/lib/types";
import { SURFACE } from "@/components/dashboard/detail-header";

export type OutcomeKey = Exclude<keyof EventOutcomeCounts, "total">;

/**
 * Event outcome series in their fixed categorical order (see --viz-* in globals.css).
 * The color follows the outcome everywhere on the page, whatever is filtered.
 */
export const OUTCOMES: Array<{ key: OutcomeKey; label: string; color: string }> = [
  { key: "confirmed", label: "Confirmed threat", color: "var(--viz-confirmed)" },
  { key: "falseAlarm", label: "AI false alarm", color: "var(--viz-false-alarm)" },
  { key: "dismissed", label: "Dismissed by operator", color: "var(--viz-dismissed)" },
  { key: "pending", label: "In pipeline", color: "var(--viz-pending)" },
];

// Formatters live in a plain module so server components can call them too.
export { formatCompact, formatDay, formatDuration, formatNumber, formatPct, parseDay } from "./format";

export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** ⓘ next to a card title: a plain-language explanation on hover or keyboard focus. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`About ${label}`}
        className="inline-flex shrink-0 rounded-full text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-left leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

export function CardShell({
  title,
  subtitle,
  info,
  action,
  children,
  className = "",
  flush = false,
}: {
  title: string;
  subtitle?: string;
  /** Plain-language explanation shown behind an ⓘ next to the title. */
  info?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Body without padding, for lists and tables that run edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className={`${SURFACE} ${className}`}>
      <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/40">
        <div>
          <h2 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
            {info && <InfoTip label={title}>{info}</InfoTip>}
          </h2>
          {subtitle && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export interface TipContent {
  title: string;
  rows: Array<{ label: string; value: string; color?: string }>;
}

/**
 * One floating tooltip for HTML marks (bar segments, heat cells). `bind(content)` returns
 * the pointer + focus handlers for a mark; the tip follows the pointer inside `containerRef`.
 */
export function useHoverTip() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [tip, setTip] = React.useState<{ x: number; y: number; flip: boolean; content: TipContent } | null>(null);

  const place = (clientX: number, clientY: number, content: TipContent) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = clientX - box.left;
    // Past the midpoint the tip opens to the left of the pointer so it never overflows the card.
    setTip({ x, y: clientY - box.top, flip: x > box.width / 2, content });
  };

  const bind = (content: TipContent) => ({
    onPointerMove: (e: React.PointerEvent) => place(e.clientX, e.clientY, content),
    onPointerLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      place(r.left + r.width / 2, r.top, content);
    },
    onBlur: () => setTip(null),
    tabIndex: 0,
  });

  const node = tip ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 min-w-36 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-sm"
      style={{
        left: tip.x,
        top: tip.y,
        transform: `translate(${tip.flip ? "calc(-100% - 12px)" : "12px"}, -50%)`,
      }}
    >
      <div className="text-muted-foreground mb-0.5">{tip.content.title}</div>
      {tip.content.rows.map((r) => (
        <div key={r.label} className="flex items-center gap-1.5">
          {r.color && <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: r.color }} />}
          <strong className="font-mono">{r.value}</strong>
          <span className="text-muted-foreground">{r.label}</span>
        </div>
      ))}
    </div>
  ) : null;

  return { containerRef, bind, node };
}
