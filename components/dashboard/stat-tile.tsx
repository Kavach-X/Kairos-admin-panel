import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { InfoTip } from "@/components/dashboard/analytics/viz";
import { formatNumber } from "@/components/dashboard/analytics/format";
import { SURFACE } from "@/components/dashboard/detail-header";

/** Change vs the previous period, e.g. "↑ 12% vs previous 30d". Neutral ink: more events is neither good nor bad. */
export function Delta({ now, prev, periodLabel }: { now: number; prev: number; periodLabel: string }) {
  const period = `vs ${periodLabel}`;
  if (prev === 0) return <span className="text-[11px] text-muted-foreground/70">{now > 0 ? `new ${period}` : period}</span>;
  const change = (now - prev) / prev;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground" title={`${formatNumber(prev)} in the ${periodLabel}`}>
      <Icon className="size-3" />
      {Math.abs(change * 100).toFixed(Math.abs(change) >= 0.1 ? 0 : 1)}% {period}
    </span>
  );
}

export function StatTile({
  label,
  value,
  note,
  swatch,
  info,
  footer,
}: {
  label: string;
  value: string;
  note?: string;
  swatch?: string;
  /** Plain-language explanation shown behind an ⓘ next to the label. */
  info?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className={`${SURFACE} space-y-1.5 p-4`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {swatch && <span className="inline-block size-2.5 rounded-[3px]" style={{ background: swatch }} />}
        {label}
        {info && <InfoTip label={label}>{info}</InfoTip>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
      </div>
      {footer}
    </div>
  );
}
